"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
  console.error(error);
  setMessage(error.message);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 px-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-3xl font-bold text-amber-500">
          💛 관리자 로그인
        </h1>

        <p className="mt-3 text-center text-gray-500">
          동명 저장소 관리자 전용 페이지입니다.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-semibold text-gray-800"
            >
              이메일
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-amber-200 px-4 py-3 text-gray-900 outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-semibold text-gray-800"
            >
              비밀번호
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-amber-200 px-4 py-3 text-gray-900 outline-none focus:border-amber-400"
            />
          </div>

          {message && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-amber-400 px-5 py-4 font-bold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}