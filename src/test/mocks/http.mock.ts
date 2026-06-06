import type { Request, Response } from 'express';

export function createMockResponse(): Response {
  return {
    clearCookie: jest.fn(),
    cookie: jest.fn(),
    redirect: jest.fn(),
  } as unknown as Response;
}

export function createMockRequest(
  cookies: Record<string, string> = {},
): Request {
  return { cookies } as Request;
}
