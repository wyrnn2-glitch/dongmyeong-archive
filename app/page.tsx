"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import ConcertCard from "../components/ConcertCard";
import { supabase } from "../lib/supabase";

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

export default function Home() {
  const [date, setDate] = useState(() => new Date());
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(
    null
  );

  const [searchTerm, setSearchTerm] = useState("");

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  const selectedDate = date.toLocaleDateString("sv-SE");

  const selectedConcerts = concerts.filter(
    (concert) => concert.date === selectedDate
  );

  const currentYear = new Date().getFullYear();

  const years = Array.from(
    { length: currentYear - 2019 + 1 },
    (_, index) => 2019 + index
  );

  const months = Array.from({ length: 12 }, (_, index) => index);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const songSearchResults = normalizedSearchTerm
    ? concerts.flatMap((concert) =>
        (concert.songs ?? [])
          .filter((song) =>
            song.title.toLowerCase().includes(normalizedSearchTerm)
          )
          .map((song) => ({
            concert,
            song,
            videoCount: song.videos?.length ?? 0,
          }))
      )
    : [];

  const favoriteConcerts = favoriteIds
    .map((favoriteId) =>
      concerts.find((concert) => concert.id === favoriteId)
    )
    .filter(
      (concert): concert is Concert => concert !== undefined
    );

  /*
   * Supabase에서 공연 불러오기
   */
  useEffect(() => {
    async function loadConcerts() {
      setIsLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("concerts")
        .select("*")
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) {
        console.error(error);
        setLoadError(`공연을 불러오지 못했어요: ${error.message}`);
        setIsLoading(false);
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
      setIsLoading(false);
    }

    loadConcerts();
  }, []);

  /*
   * 브라우저에 저장된 즐겨찾기 불러오기
   */
  useEffect(() => {
    const savedFavorites = window.localStorage.getItem(
      "dongmyeong-favorites"
    );

    if (savedFavorites) {
      try {
        const parsedFavorites = JSON.parse(savedFavorites);

        if (Array.isArray(parsedFavorites)) {
          setFavoriteIds(parsedFavorites);
        }
      } catch {
        setFavoriteIds([]);
      }
    }

    setFavoritesLoaded(true);
  }, []);

  /*
   * 즐겨찾기가 바뀌면 브라우저에 저장
   */
  useEffect(() => {
    if (!favoritesLoaded) return;

    window.localStorage.setItem(
      "dongmyeong-favorites",
      JSON.stringify(favoriteIds)
    );
  }, [favoriteIds, favoritesLoaded]);

  function handleDateChange(value: unknown) {
    if (value instanceof Date) {
      setDate(value);
      setCalendarDate(value);
      setSelectedConcertId(null);
    }
  }

  function handleConcertClick(concertId: string) {
    setSelectedConcertId((currentId) =>
      currentId === concertId ? null : concertId
    );
  }

  function handleTodayClick() {
    const currentDate = new Date();

    setDate(currentDate);
    setCalendarDate(currentDate);
    setSelectedConcertId(null);
  }

  function handlePreviousMonth() {
    setCalendarDate(
      (currentDate) =>
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          1
        )
    );

    setSelectedConcertId(null);
  }

  function handleNextMonth() {
    setCalendarDate(
      (currentDate) =>
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          1
        )
    );

    setSelectedConcertId(null);
  }

  function handleYearChange(year: number) {
    setCalendarDate(
      (currentDate) =>
        new Date(year, currentDate.getMonth(), 1)
    );

    setSelectedConcertId(null);
  }

  function handleMonthChange(month: number) {
    setCalendarDate(
      (currentDate) =>
        new Date(currentDate.getFullYear(), month, 1)
    );

    setSelectedConcertId(null);
  }

  function moveToConcert(concertId: string, concertDate: string) {
    const targetDate = new Date(`${concertDate}T00:00:00`);

    setDate(targetDate);
    setCalendarDate(targetDate);
    setSelectedConcertId(concertId);

    window.setTimeout(() => {
      document
        .getElementById("concert-list")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  function handleSearchResultClick(
    concertId: string,
    concertDate: string
  ) {
    setSearchTerm("");
    moveToConcert(concertId, concertDate);
  }

  function handleFavoriteClick(concertId: string) {
    setFavoriteIds((currentIds) => {
      if (currentIds.includes(concertId)) {
        return currentIds.filter((id) => id !== concertId);
      }

      return [...currentIds, concertId];
    });
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-amber-50 px-5">
        <div className="rounded-3xl bg-white px-8 py-6 text-center shadow-xl">
          <p className="text-xl font-bold text-amber-500">
            💛 공연을 불러오는 중...
          </p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-amber-50 px-5">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-red-500">
            공연을 불러오지 못했어요
          </h1>

          <p className="mt-4 break-words text-gray-600">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-amber-400 px-6 py-3 font-bold text-white transition hover:bg-amber-500"
          >
            다시 불러오기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-amber-50 px-5 py-10">
      <h1 className="text-center text-5xl font-bold text-amber-500">
        💛
      </h1>

   

      {/* 1. 달력 */}
      <section className="mt-10 flex justify-center">
        <div className="flex w-full max-w-2xl flex-col rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleTodayClick}
              className="rounded-full bg-amber-400 px-6 py-2 font-bold text-white shadow-sm transition hover:bg-amber-500"
            >
              📅 오늘
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePreviousMonth}
              aria-label="이전 달"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-white text-xl font-bold text-amber-600 transition hover:bg-amber-100"
            >
              ‹
            </button>

            <select
              value={calendarDate.getFullYear()}
              onChange={(event) =>
                handleYearChange(Number(event.target.value))
              }
              aria-label="연도 선택"
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 font-bold text-gray-800 outline-none focus:border-amber-400"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>

            <select
              value={calendarDate.getMonth()}
              onChange={(event) =>
                handleMonthChange(Number(event.target.value))
              }
              aria-label="월 선택"
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 font-bold text-gray-800 outline-none focus:border-amber-400"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month + 1}월
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="다음 달"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-white text-xl font-bold text-amber-600 transition hover:bg-amber-100"
            >
              ›
            </button>
          </div>

          <div className="mt-6 flex flex-1 items-center justify-center">
            <Calendar
              className="dongmyeong-calendar"
              value={date}
              activeStartDate={calendarDate}
              onChange={handleDateChange}
              onActiveStartDateChange={({ activeStartDate }) => {
                if (activeStartDate) {
                  setCalendarDate(activeStartDate);
                }
              }}
              showNavigation={false}
              formatShortWeekday={(_, currentDate) =>
                ["일", "월", "화", "수", "목", "금", "토"][
                  currentDate.getDay()
                ]
              }
              formatDay={(_, currentDate) =>
                currentDate.getDate().toString()
              }
              tileContent={({ date: currentDate, view }) => {
                if (view !== "month") return null;

                const formatted =
                  currentDate.toLocaleDateString("sv-SE");

                const count = concerts.filter(
                  (concert) => concert.date === formatted
                ).length;

                if (count === 0) return null;

                return (
                  <div className="concert-marker">
                    {count === 1 ? (
                      "💛"
                    ) : (
                      <>
                        💛
                        <sup className="text-[9px]">
                          {count}
                        </sup>
                      </>
                    )}
                  </div>
                );
              }}
            />
          </div>
        </div>
      </section>

      {/* 2. 공연 카드와 상세정보 */}
      <section
        id="concert-list"
        className="mx-auto mt-10 max-w-3xl scroll-mt-6"
      >
        <h2 className="mb-5 text-2xl font-bold text-gray-900">
          📅 {selectedDate}
        </h2>

        {selectedConcerts.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-gray-400 shadow">
            등록된 공연이 없습니다.
          </div>
        ) : (
          <div className="space-y-5">
            {selectedConcerts.map((concert) => {
              const isSelected =
                selectedConcertId === concert.id;

              const isFavorite =
                favoriteIds.includes(concert.id);

              return (
                <div key={concert.id}>
                  <ConcertCard
                    concert={concert}
                    isSelected={isSelected}
                    onClick={() =>
                      handleConcertClick(concert.id)
                    }
                  />

                  {isSelected && (
                    <div className="mt-3 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl">
                      {concert.thumbnail && (
                        <img
                          src={concert.thumbnail}
                          alt={concert.title}
                          className="max-h-[500px] w-full object-cover"
                        />
                      )}

                      <div className="p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-3xl font-bold text-gray-900">
                              {concert.title}
                            </h3>

                            {concert.place && (
                              <p className="mt-3 text-gray-500">
                                📍 {concert.place}
                              </p>
                            )}

                            {concert.time && (
                              <p className="mt-1 text-gray-500">
                                🕒 {concert.time}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleFavoriteClick(concert.id)
                            }
                            aria-pressed={isFavorite}
                            className={`shrink-0 rounded-full border px-4 py-2 font-semibold transition ${
                              isFavorite
                                ? "border-amber-400 bg-amber-400 text-white"
                                : "border-amber-300 bg-white text-amber-600 hover:bg-amber-50"
                            }`}
                          >
                            {isFavorite
                              ? "★ 즐겨찾기"
                              : "☆ 즐겨찾기"}
                          </button>
                        </div>

                        {concert.playlist && (
                          <a
                            href={concert.playlist}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-6 block rounded-xl bg-amber-400 px-5 py-4 text-center font-bold text-gray-900 transition hover:bg-amber-500"
                          >
                            ▶ YOUTUBE PLAYLIST
                          </a>
                        )}

                        <div className="mt-8">
                          <h4 className="text-xl font-bold text-gray-900">
                            🎵 SET LIST
                          </h4>

                          {concert.songs.length === 0 ? (
                            <p className="mt-4 text-gray-400">
                              등록된 세트리스트가 없습니다.
                            </p>
                          ) : (
                            <div className="mt-4 divide-y divide-gray-100">
                              {concert.songs.map(
                                (song, songIndex) => {
                                  const videos =
                                    song.videos ?? [];

                                  const hasVideo =
                                    videos.length > 0;

                                  return (
                                    <div
                                      key={`${concert.id}-${song.title}-${songIndex}`}
                                      className="py-4"
                                    >
                                      <div
                                        className={
                                          hasVideo
                                            ? "font-semibold text-gray-900"
                                            : "text-gray-400"
                                        }
                                      >
                                        {hasVideo ? "🎥" : "○"}{" "}
                                        {song.title}
                                      </div>

                                      {hasVideo && (
                                        <div className="mt-2 space-y-2 pl-7">
                                          {videos.map(
                                            (
                                              video,
                                              videoIndex
                                            ) => (
                                              <a
                                                key={`${video.url}-${videoIndex}`}
                                                href={video.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block text-sm font-medium text-amber-600 hover:underline"
                                              >
                                                ↳ {video.title}
                                              </a>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. 노래 검색 */}
      <section className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-xl font-bold text-gray-900">
          🔍 노래 검색
        </h2>

        <label htmlFor="song-search" className="sr-only">
          노래 제목
        </label>

        <input
          id="song-search"
          type="search"
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
          placeholder="노래 제목을 입력하세요"
          className="mt-3 w-full rounded-2xl border border-amber-200 bg-white px-5 py-4 text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />

        {normalizedSearchTerm && (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow">
            <h3 className="font-bold text-gray-900">
              검색 결과 {songSearchResults.length}개
            </h3>

            {songSearchResults.length === 0 ? (
              <p className="mt-4 text-gray-400">
                해당 노래가 없습니다.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {songSearchResults.map(
                  (
                    { concert, song, videoCount },
                    resultIndex
                  ) => (
                    <button
                      key={`${concert.id}-${song.title}-${resultIndex}`}
                      type="button"
                      onClick={() =>
                        handleSearchResultClick(
                          concert.id,
                          concert.date
                        )
                      }
                      className="w-full rounded-xl border border-amber-100 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
                    >
                      <div className="font-bold text-gray-900">
                        🎵 {song.title}
                      </div>

                      <div className="mt-2 text-sm text-gray-500">
                        📅 {concert.date} · {concert.title}
                      </div>

                      <div className="mt-1 text-sm text-amber-600">
                        🎥 영상 {videoCount}개
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. 즐겨찾기 */}
      <section className="mx-auto mt-12 max-w-3xl pb-12">
        <h2 className="text-xl font-bold text-gray-900">
          ⭐ 즐겨찾기
        </h2>

        {favoriteConcerts.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-amber-100 bg-white p-5 text-center text-gray-400 shadow-sm">
            즐겨찾기한 공연이 없습니다.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {favoriteConcerts.map((concert) => {
              const videoCount = concert.songs.reduce(
                (count, song) =>
                  count + (song.videos?.length ?? 0),
                0
              );

              return (
                <button
                  key={concert.id}
                  type="button"
                  onClick={() =>
                    moveToConcert(
                      concert.id,
                      concert.date
                    )
                  }
                  className="rounded-2xl border border-amber-100 bg-white p-4 text-left shadow-sm transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <div className="font-bold text-gray-900">
                    ★ {concert.title} ({videoCount})
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    📅 {concert.date}
                  </div>

                  {concert.place && (
                    <div className="mt-1 text-sm text-gray-500">
                      📍 {concert.place}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}