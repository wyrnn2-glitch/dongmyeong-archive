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
  title: string;
  place: string;
  time: string;
  thumbnail: string;
  playlist: string;
  songs: Song[];
};

type Props = {
  concert: Concert;
  isSelected: boolean;
  onClick: () => void;
};

export default function ConcertCard({
  concert,
  isSelected,
  onClick,
}: Props) {
  const videoCount = concert.songs.reduce(
    (count, song) => count + (song.videos?.length ?? 0),
    0
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 flex items-center gap-4 text-left transition
        ${
          isSelected
            ? "border-amber-400 bg-amber-50 shadow-lg"
            : "border-gray-100 bg-white shadow-md hover:shadow-xl hover:scale-[1.01]"
        }`}
    >
      <img
        src={concert.thumbnail}
        alt={concert.title}
        className="h-24 w-24 rounded-xl object-cover"
      />

      <div className="flex-1">
        <h2 className="text-xl font-bold text-gray-900">
          🎤 {concert.title} ({videoCount})
        </h2>

        <p className="mt-2 text-gray-500">📍 {concert.place}</p>
        <p className="mt-1 text-gray-500">🕒 {concert.time}</p>
      </div>

      <div className="text-2xl text-gray-400">
        {isSelected ? "⌄" : "›"}
      </div>
    </button>
  );
}