/** Timestamp display for messages */
interface TimestampProps {
  date: Date;
}

export const Timestamp = ({ date }: TimestampProps) => {
  return (
    <time className="block text-[10px] text-text-dim mt-2">
      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </time>
  );
}
