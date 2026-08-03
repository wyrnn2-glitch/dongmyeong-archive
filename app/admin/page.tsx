"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Video = {
  title: string;
  url: string;
};

type Song = {
  title: string;
  videos: Video[];
};

type Concert = {
  id: string;
  date: string;
  title: string;
  place: string;
  time: string;
  thumbnail: string;
  playlist: string;
  songs: Song[];
  created_at?: string;
};

type ConcertForm = {
  id: string;
  date: string;
  title: string;
  place: string;
  time: string;
  playlist: string;
  setlistText: string;
};

const emptyForm: ConcertForm = {
  id: "",
  date: "",
  title: "",
  place: "",
  time: "",
  playlist: "",
  setlistText: "",
};

export default function AdminPage() {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConcerts, setIsLoadingConcerts] = useState(true);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState<ConcertForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [concerts, setConcerts] = useState<Concert[]>([]);

  // 수정 중인 공연 ID
  const [editingId, setEditingId] = useState<string | null>(null);

  // 수정 전 기존 대표사진 주소
  const [existingThumbnail, setExistingThumbnail] = useState("");

  const loadConcerts = useCallback(async () => {
    setIsLoadingConcerts(true);

    const { data, error } = await supabase
      .from("concerts")
      .select("*")
      .order("date", { ascending: false })
      .order("time", { ascending: true });

    if (error) {
      setMessage(`공연 목록 불러오기 실패: ${error.message}`);
      setIsLoadingConcerts(false);
      return;
    }

    const loadedConcerts = (data ?? []).map((concert) => ({
      ...concert,
      place: concert.place ?? "",
      time: concert.time ?? "",
      thumbnail: concert.thumbnail ?? "",
      playlist: concert.playlist ?? "",
      songs: Array.isArray(concert.songs) ? concert.songs : [],
    })) as Concert[];

    setConcerts(loadedConcerts);
    setIsLoadingConcerts(false);
  }, []);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/admin/login");
        return;
      }

      setEmail(user.email ?? "");
      setIsChecking(false);

      await loadConcerts();
    }

    checkUser();
  }, [loadConcerts, router]);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
  }

  function resetImageInput() {
    const imageInput =
      document.querySelector<HTMLInputElement>("#thumbnail-file");

    if (imageInput) {
      imageInput.value = "";
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setImageFile(null);
    setEditingId(null);
    setExistingThumbnail("");
    resetImageInput();
  }

  function createIdFromDate(date: string) {
    const compactDate = date.replaceAll("-", "").slice(2);

    const sameDateConcerts = concerts.filter(
      (concert) => concert.date === date
    );

    if (sameDateConcerts.length === 0) {
      return compactDate;
    }

    const usedIds = new Set(
      sameDateConcerts.map((concert) => concert.id)
    );

    let order = 1;

    while (usedIds.has(`${compactDate}_${order}`)) {
      order += 1;
    }

    return `${compactDate}_${order}`;
  }

  function parseSetlist(text: string): Song[] {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const songMap = new Map<string, Song>();

    for (const line of lines) {
      const separatorIndex = line.indexOf("|");

      const songTitle =
        separatorIndex === -1
          ? line.trim()
          : line.slice(0, separatorIndex).trim();

      const videoPart =
        separatorIndex === -1
          ? ""
          : line.slice(separatorIndex + 1).trim();

      if (!songTitle) continue;

      if (!songMap.has(songTitle)) {
        songMap.set(songTitle, {
          title: songTitle,
          videos: [],
        });
      }

      if (!videoPart) continue;

      const equalIndex = videoPart.indexOf("=");

      if (equalIndex === -1) continue;

      const videoTitle = videoPart.slice(0, equalIndex).trim();
      const videoUrl = videoPart.slice(equalIndex + 1).trim();

      if (!videoTitle || !videoUrl) continue;

      songMap.get(songTitle)?.videos.push({
        title: videoTitle,
        url: videoUrl,
      });
    }

    return Array.from(songMap.values());
  }

  function songsToSetlistText(songs: Song[]) {
    const lines: string[] = [];

    for (const song of songs ?? []) {
      const videos = song.videos ?? [];

      if (videos.length === 0) {
        lines.push(song.title);
        continue;
      }

      for (const video of videos) {
        lines.push(`${song.title} | ${video.title}=${video.url}`);
      }
    }

    return lines.join("\n");
  }

  async function uploadImage(
    concertId: string,
    file: File
  ): Promise<string> {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const filePath = `${concertId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("concert-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("concert-images")
      .getPublicUrl(filePath);

    // 같은 파일명으로 교체했을 때 브라우저 캐시 방지
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  function handleEdit(concert: Concert) {
    setEditingId(concert.id);
    setExistingThumbnail(concert.thumbnail);

    setForm({
      id: concert.id,
      date: concert.date,
      title: concert.title,
      place: concert.place ?? "",
      time: concert.time ?? "",
      playlist: concert.playlist ?? "",
      setlistText: songsToSetlistText(concert.songs ?? []),
    });

    setImageFile(null);
    setMessage(`${concert.title} 공연을 수정 중이에요.`);
    resetImageInput();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleCancelEdit() {
    resetForm();
    setMessage("수정을 취소했어요.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (!form.date || !form.title.trim()) {
      setMessage("날짜와 공연명은 꼭 입력해주세요.");
      return;
    }

    if (!editingId && !imageFile) {
      setMessage("새 공연을 등록할 때는 대표사진이 필요해요.");
      return;
    }

    setIsSaving(true);

    try {
      const concertId =
        editingId ?? form.id.trim() ?? createIdFromDate(form.date);

      const finalConcertId =
        concertId || createIdFromDate(form.date);

      let thumbnailUrl = existingThumbnail;

      if (imageFile) {
        thumbnailUrl = await uploadImage(
          finalConcertId,
          imageFile
        );
      }

      const songs = parseSetlist(form.setlistText);

      const concertData = {
        date: form.date,
        title: form.title.trim(),
        place: form.place.trim(),
        time: form.time,
        thumbnail: thumbnailUrl,
        playlist: form.playlist.trim(),
        songs,
      };

      if (editingId) {
        const { error } = await supabase
          .from("concerts")
          .update(concertData)
          .eq("id", editingId);

        if (error) {
          throw new Error(error.message);
        }

        setMessage("공연 수정이 완료됐어요.");
      } else {
        const { error } = await supabase
          .from("concerts")
          .insert({
            id: finalConcertId,
            ...concertData,
          });

        if (error) {
          throw new Error(error.message);
        }

        setMessage("새 공연이 저장됐어요.");
      }

      resetForm();
      await loadConcerts();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";

      setMessage(`저장 실패: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(concert: Concert) {
    const shouldDelete = window.confirm(
      `${concert.title} 공연을 정말 삭제할까요?`
    );

    if (!shouldDelete) return;

    setMessage("");

    const { error } = await supabase
      .from("concerts")
      .delete()
      .eq("id", concert.id);

    if (error) {
      setMessage(`삭제 실패: ${error.message}`);
      return;
    }

    const thumbnailWithoutQuery =
      concert.thumbnail.split("?")[0];

    if (thumbnailWithoutQuery.includes("/concert-images/")) {
      const fileName = thumbnailWithoutQuery.split("/").pop();

      if (fileName) {
        await supabase.storage
          .from("concert-images")
          .remove([fileName]);
      }
    }

    if (editingId === concert.id) {
      resetForm();
    }

    setMessage("공연이 삭제됐어요.");
    await loadConcerts();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-amber-50">
        <p className="text-gray-500">관리자 확인 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-amber-50 px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-500">
              💛 관리자 페이지
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              로그인 계정: {email}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-full border border-amber-300 px-4 py-2 font-semibold text-amber-600 transition hover:bg-amber-50"
            >
              사이트 보기
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-gray-300 px-4 py-2 font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              로그아웃
            </button>
          </div>
        </header>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? "공연 수정" : "공연 등록"}
              </h2>

              {editingId && (
                <p className="mt-2 text-sm text-amber-600">
                  현재 {editingId} 공연을 수정하고 있어요.
                </p>
              )}
            </div>

            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-full border border-gray-300 px-4 py-2 font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                수정 취소
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="date"
                  className="mb-2 block font-semibold text-gray-800"
                >
                  공연 날짜 *
                </label>

                <input
                  id="date"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-xl border border-amber-200 px-4 py-3 text-gray-900 outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label
                  htmlFor="id"
                  className="mb-2 block font-semibold text-gray-800"
                >
                  공연 ID
                </label>

                <input
                  id="id"
                  name="id"
                  type="text"
                  value={form.id}
                  onChange={handleInputChange}
                  disabled={editingId !== null}
                  placeholder="비워두면 날짜 기준으로 자동 생성"
                  className="w-full rounded-xl border border-amber-200 px-4 py-3 text-gray-900 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                />

                {editingId && (
                  <p className="mt-2 text-xs text-gray-400">
                    수정 중에는 공연 ID를 변경할 수 없어요.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="title"
                className="mb-2 block font-semibold text-gray-800"
              >
                공연명 *
              </label>

              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleInputChange}
                required
                placeholder="예: 부산 락페"
                className="w-full rounded-xl border border-amber-200 px-4 py-3 text-gray-900 outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="place"
                  className="mb-2 block font-semibold text-gray-800"
                >
                  장소
                </label>

                <input
                  id="place"
                  name="place"
                  type="text"
                  value={form.place}
                  onChange={handleInputChange}
                  placeholder="예: 부산 삼락생태공원"
                  className="w-full rounded-xl border border-amber-200 px-4 py-3 text-gray-900 outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label
                  htmlFor="time"
                  className="mb-2 block font-semibold text-gray-800"
                >
                  시간
                </label>

                <input
                  id="time"
                  name="time"
                  type="time"
                  value={form.time}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-amber-200 px-4 py-3 text-gray-900 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="thumbnail-file"
                className="mb-2 block font-semibold text-gray-800"
              >
                대표사진 {editingId ? "" : "*"}
              </label>

              {editingId && existingThumbnail && (
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-500">
                    현재 대표사진
                  </p>

                  <img
                    src={existingThumbnail}
                    alt="현재 대표사진"
                    className="h-40 w-40 rounded-xl object-cover"
                  />
                </div>
              )}

              <input
                id="thumbnail-file"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                required={!editingId}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-gray-900"
              />

              {editingId && !imageFile && (
                <p className="mt-2 text-sm text-gray-500">
                  새 사진을 선택하지 않으면 기존 사진을 유지해요.
                </p>
              )}

              {imageFile && (
                <p className="mt-2 text-sm text-gray-500">
                  새로 선택한 파일: {imageFile.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="playlist"
                className="mb-2 block font-semibold text-gray-800"
              >
                유튜브 플레이리스트
              </label>

              <input
                id="playlist"
                name="playlist"
                type="url"
                value={form.playlist}
                onChange={handleInputChange}
                placeholder="https://youtube.com/playlist?list=..."
                className="w-full rounded-xl border border-amber-200 px-4 py-3 text-gray-900 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label
                htmlFor="setlistText"
                className="mb-2 block font-semibold text-gray-800"
              >
                세트리스트와 영상
              </label>

              <textarea
                id="setlistText"
                name="setlistText"
                value={form.setlistText}
                onChange={handleInputChange}
                rows={12}
                placeholder={`영상이 없는 곡:
야행성

영상이 있는 곡:
Rain To Be | 동명캠=https://youtube.com/...

같은 곡 영상이 여러 개면:
Rain To Be | 고정캠=https://youtube.com/...`}
                className="w-full rounded-xl border border-amber-200 px-4 py-3 text-gray-900 outline-none focus:border-amber-400"
              />
            </div>

            {message && (
              <p className="rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-amber-400 px-5 py-4 font-bold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "저장 중..."
                : editingId
                  ? "공연 수정 저장"
                  : "새 공연 저장"}
            </button>
          </form>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900">
            등록된 공연
          </h2>

          {isLoadingConcerts ? (
            <p className="mt-5 text-gray-500">
              공연 목록을 불러오는 중...
            </p>
          ) : concerts.length === 0 ? (
            <p className="mt-5 text-gray-400">
              아직 등록된 공연이 없습니다.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {concerts.map((concert) => {
                const videoCount = (concert.songs ?? []).reduce(
                  (count, song) =>
                    count + (song.videos?.length ?? 0),
                  0
                );

                return (
                  <article
                    key={concert.id}
                    className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                      editingId === concert.id
                        ? "border-amber-400 bg-amber-50"
                        : "border-amber-100"
                    }`}
                  >
                    {concert.thumbnail && (
                      <img
                        src={concert.thumbnail}
                        alt={concert.title}
                        className="h-28 w-full rounded-xl object-cover sm:w-32"
                      />
                    )}

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {concert.title} ({videoCount})
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {concert.date} ·{" "}
                        {concert.time || "시간 미입력"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {concert.place || "장소 미입력"}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        ID: {concert.id}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(concert)}
                        className="flex-1 rounded-xl border border-amber-300 px-4 py-2 font-semibold text-amber-600 transition hover:bg-amber-50"
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(concert)}
                        className="flex-1 rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-500 transition hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}