"use client";

import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AiHealthQuestionSection() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setIsLoading(true);
    setError("");
    setAnswer("");
    setSubmittedQuestion(trimmedQuestion);

    try {
      const response = await fetch(
        "/api/ai-health-question",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: trimmedQuestion }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data && typeof data === "object" && "error" in data
          ? String(data.error)
          : "AI 답변을 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
        throw new Error(errorMsg);
      }

      const resultAnswer = data && typeof data === "object" && "answer" in data
        ? String(data.answer)
        : "";

      if (!resultAnswer) {
        throw new Error("답변 데이터 형식이 올바르지 않습니다.");
      }

      setAnswer(resultAnswer);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "AI 답변을 가져오는 중 오류가 발생했습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="rounded-lg border border-[#c6d9bd] bg-[#fffdf7] p-6 shadow-[0_16px_60px_rgba(31,75,54,0.12)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-extrabold text-[#2f6c48]">AI 건강 상담</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight text-[#173d2d] sm:text-4xl">
            AI 건강 질문하기
          </h2>
          <p className="mt-4 text-base leading-8 text-[#526257] sm:text-lg">
            평소 궁금했던 건강 증상이나 생활 습관에 대해 AI에게 물어보세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="ai-health-question">
            AI에게 물어볼 건강 질문
          </label>
          <input
            id="ai-health-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            placeholder="예: 환절기 기침 증상 완화법을 알려주세요."
            className="min-h-12 flex-1 rounded-lg border border-[#c9d9c2] bg-white px-4 text-base text-[#173d2d] outline-none transition placeholder:text-[#7a8a7f] focus:border-[#2f6c48] focus:ring-4 focus:ring-[#d9ead2] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="min-h-12 rounded-lg bg-[#174330] px-6 text-base font-bold text-white transition hover:bg-[#255f42] focus:outline-none focus:ring-4 focus:ring-[#b9d8ab] disabled:cursor-not-allowed disabled:bg-[#9eaa9d]"
          >
            {isLoading ? "답변 생성 중..." : "AI에게 질문하기"}
          </button>
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-lg border border-[#d5dfcd] bg-[#f5f9f1] p-6 text-[#2f6c48]">
            <svg className="h-5 w-5 animate-spin text-[#2f6c48]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-semibold">AI가 질문을 분석하고 신뢰할 수 있는 답변을 생성하고 있습니다...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-6 rounded-lg border border-[#efb8a5] bg-[#fff7f3] p-5 text-[#9a3f25]">
            <p className="font-extrabold">오류 발생</p>
            <p className="mt-1 text-sm leading-6">{error}</p>
          </div>
        )}

        {/* Answer Display */}
        {answer && (
          <div className="mt-6 rounded-lg border border-[#c6d9bd] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f4faf0] pb-4 mb-4">
              <span className="inline-block px-2.5 py-1 rounded bg-[#eef6e9] text-sm text-[#2f6c48] font-bold">AI 답변</span>
              <span className="text-sm font-bold text-[#526257]">질문: &ldquo;{submittedQuestion}&ldquo;</span>
            </div>
            
            <div className="text-base leading-8 text-[#355845]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-4 last:mb-0 leading-8 text-[#355845]">{children}</p>,
                  strong: ({ children }) => <strong className="font-extrabold text-[#173d2d]">{children}</strong>,
                  h1: ({ children }) => <h1 className="text-2xl font-extrabold text-[#173d2d] mt-6 mb-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-extrabold text-[#173d2d] mt-5 mb-2.5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-extrabold text-[#173d2d] mt-4 mb-2">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1.5 text-[#355845]">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1.5 text-[#355845]">{children}</ol>,
                  li: ({ children }) => <li className="leading-7">{children}</li>,
                }}
              >
                {answer}
              </ReactMarkdown>
            </div>
            
            <p className="mt-6 text-xs text-[#7a8a7f] leading-5 bg-[#fbfaf5] p-3 rounded-lg border border-[#dfe8d8]">
              * 본 AI 건강 답변은 단순 참고용 정보이며, 의료 전문가의 전문적인 진료나 진단, 치료 조언을 대신할 수 없습니다. 
              자세한 증상 진단이나 치료 방향 설정은 반드시 의사 및 의료진과 상의해 주시기 바랍니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
