const MAX_QUESTION_LENGTH = 1000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

type RequestBody = {
    question?: unknown;
};

type N8nResponse = {
    answer?: unknown;
};

type RateLimitRecord = {
    count: number;
    resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
    aiHealthQuestionRateLimit?: Map<string, RateLimitRecord>;
};

const rateLimitStore =
    globalForRateLimit.aiHealthQuestionRateLimit ??
    new Map<string, RateLimitRecord>();

globalForRateLimit.aiHealthQuestionRateLimit = rateLimitStore;

function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get("x-forwarded-for");

    if (forwardedFor) {
        return forwardedFor.split(",")[0]?.trim() || "unknown";
    }

    return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function checkRateLimit(clientIp: string) {
    const now = Date.now();

    if (rateLimitStore.size > 1000) {
        for (const [ip, record] of rateLimitStore.entries()) {
            if (record.resetAt <= now) {
                rateLimitStore.delete(ip);
            }
        }
    }

    const currentRecord = rateLimitStore.get(clientIp);

    if (!currentRecord || currentRecord.resetAt <= now) {
        rateLimitStore.set(clientIp, {
            count: 1,
            resetAt: now + RATE_LIMIT_WINDOW_MS,
        });

        return {
            allowed: true,
            retryAfterSeconds: 0,
        };
    }

    if (currentRecord.count >= MAX_REQUESTS_PER_WINDOW) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(
                1,
                Math.ceil((currentRecord.resetAt - now) / 1000),
            ),
        };
    }

    currentRecord.count += 1;
    rateLimitStore.set(clientIp, currentRecord);

    return {
        allowed: true,
        retryAfterSeconds: 0,
    };
}

export async function POST(request: Request) {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
        return Response.json(
            {
                error: "질문 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
            },
            {
                status: 429,
                headers: {
                    "Retry-After": String(rateLimit.retryAfterSeconds),
                },
            },
        );
    }

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