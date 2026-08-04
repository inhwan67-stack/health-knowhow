"use client";

import { FormEvent, useState } from "react";

type HomeAiQuestionFormProps = {
  recommendedQuestions: string[];
};

type AiQuestionApiResponse = {
  answer?: unknown;
  error?: unknown;
};

function getResponseText(data: AiQuestionApiResponse | null): string {
  if (!data || typeof data.answer !== "string") {
    return "";
  }

  return data.answer.trim();
}

function getErrorText(data: AiQuestionApiResponse | null): string {
  if (data && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  return "답변 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function HomeAiQuestionForm({
  recommendedQuestions,
}: HomeAiQuestionFormProps) {
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isLoading) {
      return;
    }

    setIsLoading(true);
    setSubmittedQuestion(trimmedQuestion);
    setAnswer("");
    setError("");

    try {
      const response = await fetch("/api/ai-health-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmedQuestion }),
      });

      const data = (await response.json().catch(() => null)) as AiQuestionApiResponse | null;

      if (!response.ok) {
        throw new Error(getErrorText(data));
      }

      const result = getResponseText(data);

      if (!result) {
        throw new Error("답변 데이터가 없습니다.");
      }

      setAnswer(result);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "답변을 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-7 max-w-[505px]">
      <form onSubmit={handleSubmit} role="search" aria-label="AI 건강 질문">
        <label htmlFor="home-health-question" className="sr-only">
          AI에게 물어볼 건강 질문
        </label>
        <div className="flex h-[58px] items-center rounded-full border border-[rgba(14,32,56,0.09)] bg-white px-5 shadow-[0_12px_34px_rgba(14,32,56,0.09)]">
          <input
            id="home-health-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={isLoading}
            type="search"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium tracking-[-0.03em] text-[#0E2038] outline-none placeholder:text-[#0E2038]/36 disabled:cursor-not-allowed"
            placeholder="어떤 증상이나 궁금한 점이 있으신가요?"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="ml-4 inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#63C8B8] text-[22px] font-black leading-none text-white shadow-[0_9px_18px_rgba(99,200,184,0.26)] transition hover:bg-[#55b6a7] focus:outline-none focus:ring-4 focus:ring-[#C6F2E8] disabled:cursor-not-allowed disabled:bg-[#9fbdb7]"
            aria-label="질문 보내기"
          >
            {isLoading ? (
              "…"
            ) : (
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20.2 4.2 4.9 11.1c-.9.4-.9 1.7.1 2l5 1.5 1.6 5c.3 1 1.6 1 2 .1l6.8-15.3c.2-.5-.3-1-1.2-.2Z"
                  fill="currentColor"
                  opacity="0.96"
                />
                <path
                  d="m10.4 14.2 4.4-4.5"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
              </svg>
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2.5" aria-label="추천 질문">
        {recommendedQuestions.map((recommendedQuestion) => (
          <button
            key={recommendedQuestion}
            type="button"
            onClick={() => setQuestion(recommendedQuestion)}
            disabled={isLoading}
            className="rounded-full bg-[#E7F5F1] px-3.5 py-1.5 text-[12px] font-semibold tracking-[-0.035em] text-[#0E2038]/64 transition hover:bg-[#C6F2E8] hover:text-[#0E2038] focus:outline-none focus:ring-4 focus:ring-[#C6F2E8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {recommendedQuestion}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-4 rounded-[22px] border border-[rgba(14,32,56,0.08)] bg-white/86 px-5 py-4 text-[14px] font-bold tracking-[-0.03em] text-[#0E2038]/70 shadow-[0_12px_34px_rgba(14,32,56,0.08)] backdrop-blur">
          답변을 분석하고 있습니다…
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-[22px] border border-[#efb8a5] bg-[#fff7f3]/92 px-5 py-4 text-[14px] font-semibold leading-6 tracking-[-0.03em] text-[#9a3f25] shadow-[0_12px_34px_rgba(14,32,56,0.06)] backdrop-blur">
          {error}
        </div>
      )}

      {answer && (
        <article className="mt-4 rounded-[24px] border border-[rgba(14,32,56,0.08)] bg-white/90 p-5 shadow-[0_14px_38px_rgba(14,32,56,0.09)] backdrop-blur">
          <p className="text-[12px] font-black tracking-[-0.03em] text-[#63C8B8]">
            AI 건강 답변
          </p>
          <h2 className="mt-2 text-[15px] font-black leading-6 tracking-[-0.04em] text-[#0E2038]">
            질문: {submittedQuestion}
          </h2>
          <div className="mt-4 whitespace-pre-wrap break-words text-[14px] font-medium leading-7 tracking-[-0.03em] text-[#0E2038]/78">
            {answer}
          </div>
          <p className="mt-5 rounded-[18px] bg-[#E7F5F1] px-4 py-3 text-[12px] font-semibold leading-5 tracking-[-0.03em] text-[#0E2038]/62">
            이 답변은 참고용 건강정보이며 진단이나 처방을 대체하지 않습니다.
            증상이 심하거나 지속되면 의료진과 상담해 주세요.
          </p>
        </article>
      )}
    </div>
  );
}
