import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const MAX_QUESTION_LENGTH = 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

type RequestBody = {
    question?: unknown;
};

type N8nResponse = {
    answer?: unknown;
};

let rateLimiter: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
        return null;
    }

    if (!rateLimiter) {
        const redis = new Redis({
            url,
            token,
        });

        rateLimiter = new Ratelimit({
            redis,
            limiter: Ratelimit.fixedWindow(
                MAX_REQUESTS_PER_WINDOW,
                "60 s",
            ),
            prefix: "ratelimit:ai-health-question",
        });
    }

    return rateLimiter;
}

function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get("x-forwarded-for");

    if (forwardedFor) {
        return forwardedFor.split(",")[0]?.trim() || "unknown";
    }

    return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
    let body: RequestBody;

    try {
        body = (await request.json()) as RequestBody;
    } catch {
        return Response.json(
            { error: "올바른 요청 형식이 아닙니다." },
            { status: 400 },
        );
    }

    const question =
        typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
        return Response.json(
            { error: "질문을 입력해 주세요." },
            { status: 400 },
        );
    }

    if (question.length > MAX_QUESTION_LENGTH) {
        return Response.json(
            { error: "질문은 1,000자 이하로 입력해 주세요." },
            { status: 400 },
        );
    }

    const limiter = getRateLimiter();

    if (!limiter) {
        return Response.json(
            { error: "사용량 제한 서비스 설정이 완료되지 않았습니다." },
            { status: 500 },
        );
    }

    try {
        const clientIp = getClientIp(request);
        const result = await limiter.limit(`ip:${clientIp}`);

        if (!result.success) {
            const retryAfterSeconds = Math.max(
                1,
                Math.ceil((result.reset - Date.now()) / 1000),
            );

            return Response.json(
                {
                    error: "질문 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(retryAfterSeconds),
                        "Cache-Control": "no-store",
                    },
                },
            );
        }
    } catch {
        return Response.json(
            {
                error: "사용량 제한 서비스를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
            },
            { status: 503 },
        );
    }

    const webhookUrl = process.env.N8N_HEALTH_QUESTION_WEBHOOK_URL;

    if (!webhookUrl) {
        return Response.json(
            { error: "AI 질문 서비스 설정이 완료되지 않았습니다." },
            { status: 500 },
        );
    }

    try {
        const n8nResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({ question }),
            cache: "no-store",
        });

        if (!n8nResponse.ok) {
            return Response.json(
                { error: "AI 답변을 가져오는 중 오류가 발생했습니다." },
                { status: 502 },
            );
        }

        const data = (await n8nResponse.json()) as N8nResponse;

        if (typeof data.answer !== "string" || !data.answer.trim()) {
            return Response.json(
                { error: "AI 답변 형식이 올바르지 않습니다." },
                { status: 502 },
            );
        }

        return Response.json({ answer: data.answer });
    } catch {
        return Response.json(
            {
                error: "AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
            },
            { status: 502 },
        );
    }
}