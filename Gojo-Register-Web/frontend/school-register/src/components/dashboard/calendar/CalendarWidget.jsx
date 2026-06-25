import React from "react";
import { FaCalendarAlt, FaPlus } from "react-icons/fa";
import {
  ETHIOPIAN_MONTHS,
  CALENDAR_WEEK_DAYS,
  getCalendarEventMeta,
  formatCalendarDeadlineDate,
} from "../../../utils/calendar";

export default function CalendarWidget({ cal, canManageCalendar }) {
  const {
    calendarViewDate,
    calendarEventsLoading,
    selectedCalendarIsoDate,
    setSelectedCalendarIsoDate,
    hoveredCalendarIsoDate,
    setHoveredCalendarIsoDate,
    calendarActionMessage,
    showAllUpcomingDeadlines,
    setShowAllUpcomingDeadlines,
    calendarMonthLabel,
    calendarHighlightedDay,
    calendarDays,
    monthlyCalendarEvents,
    upcomingDeadlineEvents,
    visibleUpcomingDeadlineEvents,
    selectedCalendarDay,
    selectedCalendarEvents,
    calendarMonthStartGregorian,
    calendarMonthEndGregorian,
    calendarEventSaving,
    handleCalendarMonthChange,
    handleEditCalendarEvent,
    handleDeleteCalendarEvent,
    handleOpenCalendarEventModal,
    handleOpenDeadlineModal,
  } = cal;

  return (
    <>
      <div style={{ background: 'linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)', borderRadius: 20, boxShadow: 'var(--shadow-panel)', padding: '10px', border: '1px solid var(--border-soft)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 72%)', pointerEvents: 'none' }} />
        <div style={{ margin: '-10px -10px 10px', padding: '12px 10px 10px', background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface-muted) 55%, var(--surface-panel) 100%)', borderBottom: '1px solid var(--border-soft)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent-soft) 0%, color-mix(in srgb, var(--accent) 20%, transparent) 100%)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 30%, transparent), var(--shadow-glow)' }}>
                <FaCalendarAlt style={{ width: 14, height: 14 }} />
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>School Calendar</h4>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3, fontWeight: 800 }}>{calendarMonthLabel}</div>
                {calendarMonthStartGregorian && calendarMonthEndGregorian ? (
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                    {`${calendarMonthStartGregorian.day}/${calendarMonthStartGregorian.month}/${calendarMonthStartGregorian.year} - ${calendarMonthEndGregorian.day}/${calendarMonthEndGregorian.month}/${calendarMonthEndGregorian.year}`}
                  </div>
                ) : null}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => handleCalendarMonthChange(-1)}
                style={{ width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 17, lineHeight: 1, boxShadow: 'var(--shadow-soft)' }}
                aria-label="Previous month"
                title="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => handleCalendarMonthChange(1)}
                style={{ width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 17, lineHeight: 1, boxShadow: 'var(--shadow-soft)' }}
                aria-label="Next month"
                title="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--surface-panel)', border: '1px solid var(--border-soft)', fontSize: 9, color: 'var(--accent-strong)', fontWeight: 800 }}>
                {monthlyCalendarEvents.length} event{monthlyCalendarEvents.length === 1 ? '' : 's'}
              </div>
              <div style={{ padding: '4px 8px', borderRadius: 999, background: canManageCalendar ? 'var(--success-soft)' : 'var(--warning-soft)', border: canManageCalendar ? '1px solid var(--success-border)' : '1px solid var(--warning-border)', fontSize: 9, color: canManageCalendar ? 'var(--success)' : 'var(--warning)', fontWeight: 800 }}>
                {canManageCalendar ? 'Manage access' : 'View only'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(180deg, var(--surface-muted) 0%, color-mix(in srgb, var(--surface-muted) 92%, var(--page-bg) 8%) 100%)', border: '1px solid var(--border-soft)', borderRadius: 16, padding: '10px', boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 22%, transparent)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 6 }}>
            {CALENDAR_WEEK_DAYS.map((day) => (
              <div key={day} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
            {calendarDays.map((day, index) => {
              const isToday = day?.ethDay === calendarHighlightedDay;
              const dayOfWeek = index % 7;
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const primaryEvent = day?.events?.[0] || null;
              const isNoClassDay = primaryEvent?.category === 'no-class';
              const isAcademicDay = primaryEvent?.category === 'academic';
              const isSelected = day?.isoDate === selectedCalendarIsoDate;
              const isHovered = day?.isoDate === hoveredCalendarIsoDate;
              const dayBackground = day
                ? isToday
                  ? 'linear-gradient(145deg, var(--accent-soft) 0%, color-mix(in srgb, var(--accent) 26%, transparent) 100%)'
                  : isSelected
                    ? 'linear-gradient(145deg, var(--surface-accent) 0%, var(--accent-soft) 55%, color-mix(in srgb, var(--accent) 26%, transparent) 100%)'
                    : isNoClassDay
                      ? 'linear-gradient(145deg, color-mix(in srgb, var(--warning-soft) 78%, var(--surface-panel) 22%) 0%, var(--warning-soft) 100%)'
                      : isAcademicDay
                        ? 'linear-gradient(145deg, color-mix(in srgb, var(--success-soft) 78%, var(--surface-panel) 22%) 0%, var(--success-soft) 100%)'
                        : isWeekend
                          ? 'linear-gradient(145deg, var(--surface-muted) 0%, color-mix(in srgb, var(--surface-muted) 84%, var(--page-bg) 16%) 100%)'
                          : 'linear-gradient(145deg, var(--surface-panel) 0%, var(--surface-muted) 100%)'
                : 'transparent';

              return (
                <button
                  type="button"
                  key={`${day?.ethDay || 'blank'}-${index}`}
                  onClick={() => day && setSelectedCalendarIsoDate(day.isoDate)}
                  onMouseEnter={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                  onMouseLeave={() => setHoveredCalendarIsoDate("")}
                  onFocus={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                  onBlur={() => setHoveredCalendarIsoDate("")}
                  title={day?.events?.length ? day.events.map((eventItem) => eventItem.title).join(', ') : ''}
                  style={{
                    minHeight: 0,
                    aspectRatio: '1 / 1',
                    borderRadius: 10,
                    border: isToday
                      ? '1px solid var(--accent)'
                      : isSelected
                        ? '1px solid var(--accent-strong)'
                      : isHovered
                        ? '1px solid var(--border-strong)'
                        : isNoClassDay
                          ? '1px solid var(--warning-border)'
                          : '1px solid transparent',
                    background: dayBackground,
                    color: isToday ? 'var(--accent-strong)' : day ? 'var(--text-secondary)' : 'transparent',
                    fontSize: 10,
                    fontWeight: isToday ? 800 : 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    padding: '5px 2px',
                    boxShadow: day && !isToday
                      ? isSelected
                        ? 'var(--shadow-glow)'
                        : isHovered
                          ? 'var(--shadow-soft)'
                          : 'var(--shadow-soft)'
                      : 'none',
                    cursor: day ? 'pointer' : 'default',
                    outline: 'none',
                    transform: day && isSelected
                      ? 'translateY(-2px) scale(1.03)'
                      : day && isHovered
                        ? 'translateY(-1px) scale(1.015)'
                        : 'translateY(0) scale(1)',
                    transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  disabled={!day}
                >
                  {day ? (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 800, color: isToday || isSelected ? 'var(--accent-strong)' : 'var(--text-primary)', lineHeight: 1 }}>{day.ethDay}</div>
                      <div style={{ fontSize: 8, color: isSelected ? 'var(--accent)' : 'var(--text-muted)', lineHeight: 1 }}>{day.gregorianDate.day}/{day.gregorianDate.month}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 6 }}>
                        {day.events.slice(0, 2).map((eventItem) => (
                          <span
                            key={eventItem.id}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: getCalendarEventMeta(eventItem.category).color,
                              boxShadow: '0 0 0 2px color-mix(in srgb, var(--surface-panel) 84%, transparent)',
                            }}
                          />
                        ))}
                      </div>
                    </>
                  ) : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--text-secondary)', fontWeight: 800, background: 'var(--warning-soft)', border: '1px solid var(--warning-border)', borderRadius: 999, padding: '5px 8px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)' }} /> No class
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--text-secondary)', fontWeight: 800, background: 'var(--success-soft)', border: '1px solid var(--success-border)', borderRadius: 999, padding: '5px 8px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} /> Academic
          </div>
          {canManageCalendar ? (
            <button
              type="button"
              onClick={handleOpenCalendarEventModal}
              style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid var(--border-strong)', background: 'linear-gradient(135deg, var(--accent-soft) 0%, color-mix(in srgb, var(--accent) 20%, transparent) 100%)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}
              aria-label="Add school calendar event"
              title="Add school calendar event"
            >
              <FaPlus style={{ width: 12, height: 12 }} />
            </button>
          ) : null}
        </div>

        {calendarActionMessage ? (
          <div style={{ marginTop: 10, borderRadius: 12, border: '1px solid var(--success-border)', background: 'linear-gradient(180deg, color-mix(in srgb, var(--success-soft) 76%, var(--surface-panel) 24%) 0%, var(--success-soft) 100%)', color: 'var(--success)', fontSize: 10, fontWeight: 800, padding: '8px 10px', boxShadow: 'var(--shadow-soft)' }}>
            {calendarActionMessage}
          </div>
        ) : null}

        <div style={{ marginTop: 12, background: 'linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: '10px', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-primary)' }}>
                {selectedCalendarDay
                  ? `${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]} ${selectedCalendarDay.ethDay}, ${calendarViewDate.year}`
                  : 'Select a date'}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                {selectedCalendarDay
                  ? `Gregorian ${selectedCalendarDay.gregorianDate.day}/${selectedCalendarDay.gregorianDate.month}/${selectedCalendarDay.gregorianDate.year}`
                  : 'Choose a day to view or add calendar events.'}
              </div>
            </div>
            {calendarEventsLoading && (
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>Loading...</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {selectedCalendarEvents.length === 0 ? (
              <div style={{ fontSize: 9, color: 'var(--text-muted)', background: 'var(--surface-muted)', borderRadius: 10, border: '1px solid var(--border-soft)', padding: '7px 9px' }}>
                No school events on this day.
              </div>
            ) : (
              selectedCalendarEvents.map((eventItem) => {
                const eventMeta = getCalendarEventMeta(eventItem.category);

                return (
                  <div
                    key={eventItem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 7,
                      background: eventMeta.background,
                      border: `1px solid ${eventMeta.border}`,
                      borderRadius: 10,
                      padding: '7px 8px',
                    }}
                  >
                    <span style={{ width: 8, height: 8, marginTop: 4, borderRadius: '50%', background: eventMeta.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-primary)' }}>{eventItem.title}</div>
                        {eventItem.isDefault ? (
                          <span style={{ padding: '2px 6px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-strong)', fontSize: 9, fontWeight: 800 }}>Default</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{eventMeta.label}</div>
                      {eventItem.notes ? (
                        <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 3 }}>{eventItem.notes}</div>
                      ) : null}
                    </div>
                    {canManageCalendar && !eventItem.isDefault ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleEditCalendarEvent(eventItem)}
                          style={{ height: 26, padding: '0 9px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', color: 'var(--text-secondary)', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCalendarEvent(eventItem)}
                          disabled={calendarEventSaving}
                          style={{ height: 26, padding: '0 9px', borderRadius: 8, border: '1px solid var(--danger-border)', background: 'var(--surface-panel)', color: 'var(--danger)', fontSize: 9, fontWeight: 800, cursor: calendarEventSaving ? 'not-allowed' : 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)', borderRadius: 16, boxShadow: 'var(--shadow-soft)', padding: '11px', border: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Upcoming Deadlines</h4>
          {canManageCalendar ? (
            <button
              type="button"
              onClick={handleOpenDeadlineModal}
              style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid var(--success-border)', background: 'linear-gradient(135deg, color-mix(in srgb, var(--success-soft) 72%, var(--surface-panel) 28%) 0%, var(--success-soft) 100%)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-soft)' }}
              aria-label="Add upcoming deadline"
              title="Add upcoming deadline"
            >
              <FaPlus style={{ width: 11, height: 11 }} />
            </button>
          ) : null}
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {calendarEventsLoading ? (
            <div style={{ padding: '8px 9px', borderRadius: 10, border: '1px solid var(--border-soft)', background: 'var(--surface-muted)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>
              Loading deadlines...
            </div>
          ) : upcomingDeadlineEvents.length === 0 ? (
            <div style={{ padding: '8px 9px', borderRadius: 10, border: '1px solid var(--border-soft)', background: 'var(--surface-muted)', fontSize: 10, color: 'var(--text-muted)' }}>
              No upcoming deadlines in the next 30 days.
              {canManageCalendar ? (
                <button
                  type="button"
                  onClick={handleOpenDeadlineModal}
                  style={{ marginTop: 8, height: 28, padding: '0 10px', borderRadius: 999, border: '1px solid var(--success-border)', background: 'var(--surface-panel)', color: 'var(--success)', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}
                >
                  Add deadline
                </button>
              ) : null}
            </div>
          ) : (
            visibleUpcomingDeadlineEvents.map((eventItem) => {
              const eventMeta = getCalendarEventMeta(eventItem.category);

              return (
                <div
                  key={`deadline-${eventItem.id}`}
                  style={{
                    padding: '8px 9px',
                    borderRadius: 10,
                    border: `1px solid ${eventMeta.border}`,
                    background: eventMeta.background,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: eventMeta.color, flexShrink: 0 }} />
                      <span>{eventItem.title?.trim() || eventItem.notes?.trim() || 'Academic deadline'}</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
                      {eventMeta.label}
                      {eventItem.ethiopianDate?.month && eventItem.ethiopianDate?.day
                        ? ` • ${ETHIOPIAN_MONTHS[eventItem.ethiopianDate.month - 1]} ${eventItem.ethiopianDate.day}`
                        : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatCalendarDeadlineDate(eventItem.gregorianDate)}
                  </div>
                </div>
              );
            })
          )}
          {!calendarEventsLoading && upcomingDeadlineEvents.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAllUpcomingDeadlines((currentValue) => !currentValue)}
              style={{ alignSelf: 'flex-start', height: 28, padding: '0 10px', borderRadius: 999, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', color: 'var(--accent-strong)', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}
            >
              {showAllUpcomingDeadlines ? 'See less' : `See more (${upcomingDeadlineEvents.length - 3})`}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
