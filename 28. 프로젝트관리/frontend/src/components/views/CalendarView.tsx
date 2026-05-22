interface CalendarCard {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
}

interface CalendarViewProps {
  cards: CalendarCard[];
}

export function CalendarView({ cards }: CalendarViewProps) {
  const cardsWithDue = cards.filter((c) => c.due_date);

  // 날짜별 그룹화
  const grouped: Record<string, CalendarCard[]> = {};
  for (const card of cardsWithDue) {
    const date = card.due_date!;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(card);
  }

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="p-4">
      {sortedDates.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          마감일이 설정된 카드가 없습니다
        </p>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                {date}
              </h3>
              <div className="space-y-1 pl-3 border-l-2 border-gray-200">
                {grouped[date].map((card) => (
                  <div key={card.id}
                    className="text-sm p-1.5 bg-white rounded border">
                    {card.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
