export default function Loading() {
  return (
    <div className="notice" role="status">
      <progress aria-label="사건 불러오는 중" className="mr-3 w-20" />
      기록을 불러오고 있어요.
    </div>
  );
}
