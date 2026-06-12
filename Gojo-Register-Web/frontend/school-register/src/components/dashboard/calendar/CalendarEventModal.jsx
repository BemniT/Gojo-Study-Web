import React from "react";
import {
  ETHIOPIAN_MONTHS,
  CALENDAR_WEEK_DAYS,
  getCalendarEventMeta,
} from "../../../utils/calendar";

export default function CalendarEventModal({ cal, canManageCalendar }) {
  const {
    calendarViewDate,
    calendarEventForm,
    setCalendarEventForm,
    calendarEventSaving,
    selectedCalendarIsoDate,
    setSelectedCalendarIsoDate,
    editingCalendarEventId,
    showCalendarEventModal,
    calendarModalContext,
    calendarMonthLabel,
    calendarHighlightedDay,
    calendarDays,
    selectedCalendarDay,
    handleCalendarMonthChange,
    handleCreateCalendarEvent,
    handleCloseCalendarEventModal,
  } = cal;

  if (!showCalendarEventModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'color-mix(in srgb, var(--text-primary) 26%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1200,
      }}
      onClick={handleCloseCalendarEventModal}
    >
      <div
        style={{
          width: 'min(470px, 100%)',
          background: 'var(--surface-panel)',
          borderRadius: 20,
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-panel)',
          overflow: 'hidden',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ padding: '16px 16px 12px', background: 'linear-gradient(180deg, var(--surface-overlay) 0%, var(--surface-panel) 100%)', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)' }}>
              {editingCalendarEventId
                ? 'Edit school calendar event'
                : calendarModalContext === 'deadline'
                  ? 'Add upcoming deadline'
                  : 'Add school calendar event'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              {selectedCalendarDay
                ? calendarModalContext === 'deadline'
                  ? `Choose the date for this upcoming deadline in ${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]}`
                  : `For Ethiopic day ${selectedCalendarDay.ethDay} in ${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]}`
                : 'Select a day in the calendar first.'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseCalendarEventModal}
            style={{ width: 34, height: 34, borderRadius: 999, border: '1px solid var(--border-soft)', background: 'var(--surface-overlay)', color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}
            aria-label="Close calendar event modal"
          >
            ×
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!canManageCalendar ? (
            <div style={{ fontSize: 10, color: 'var(--warning)', background: 'var(--warning-soft)', border: '1px solid var(--warning-border)', borderRadius: 10, padding: '8px 10px' }}>
              View only. Registrar or admin access is required to add, edit, or delete school calendar events.
            </div>
          ) : null}

          <div style={{ border: '1px solid var(--border-soft)', borderRadius: 16, padding: 10, background: 'linear-gradient(180deg, var(--surface-overlay) 0%, var(--surface-panel) 100%)', boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 45%, transparent), var(--shadow-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-primary)' }}>Choose day from calendar</div>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{calendarMonthLabel}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleCalendarMonthChange(-1)}
                  style={{ width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border-soft)', background: 'var(--surface-overlay)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16, lineHeight: 1, boxShadow: 'var(--shadow-soft)' }}
                  aria-label="Previous Ethiopian month"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => handleCalendarMonthChange(1)}
                  style={{ width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border-soft)', background: 'var(--surface-overlay)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16, lineHeight: 1, boxShadow: 'var(--shadow-soft)' }}
                  aria-label="Next Ethiopian month"
                >
                  ›
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 5 }}>
              {CALENDAR_WEEK_DAYS.map((dayLabel) => (
                <div key={dayLabel} style={{ textAlign: 'center', fontSize: 8, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {dayLabel}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
              {calendarDays.map((dayItem, index) => {
                const isSelectedDay = dayItem?.isoDate === selectedCalendarIsoDate;
                const hasEvents = (dayItem?.events?.length || 0) > 0;
                const isTodayDay = dayItem?.ethDay === calendarHighlightedDay;
                const cellBackground = !dayItem
                  ? 'transparent'
                  : isTodayDay
                    ? 'linear-gradient(145deg, var(--accent-soft) 0%, color-mix(in srgb, var(--accent) 22%, var(--surface-overlay)) 100%)'
                    : isSelectedDay
                      ? 'linear-gradient(145deg, var(--surface-overlay) 0%, var(--accent-soft) 55%, color-mix(in srgb, var(--accent) 22%, var(--surface-overlay)) 100%)'
                      : hasEvents
                        ? 'linear-gradient(145deg, color-mix(in srgb, var(--warning-soft) 72%, var(--surface-panel)) 0%, var(--warning-soft) 100%)'
                        : 'linear-gradient(145deg, var(--surface-panel) 0%, var(--surface-overlay) 100%)';

                return (
                  <button
                    key={`${dayItem?.isoDate || 'blank'}-${index}`}
                    type="button"
                    onClick={() => dayItem && setSelectedCalendarIsoDate(dayItem.isoDate)}
                    disabled={!dayItem || !canManageCalendar}
                    style={{
                      minHeight: 0,
                      aspectRatio: '1 / 1',
                      borderRadius: 10,
                      border: isTodayDay ? '1px solid var(--accent)' : isSelectedDay ? '1px solid var(--accent-strong)' : hasEvents ? '1px solid var(--warning-border)' : '1px solid transparent',
                      background: cellBackground,
                      color: !dayItem ? 'transparent' : isSelectedDay || isTodayDay ? 'var(--accent-strong)' : 'var(--text-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      cursor: dayItem && canManageCalendar ? 'pointer' : 'default',
                      boxShadow: isSelectedDay
                        ? '0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent), 0 12px 22px color-mix(in srgb, var(--accent-strong) 18%, transparent)'
                        : isTodayDay
                          ? '0 10px 18px color-mix(in srgb, var(--accent-strong) 14%, transparent)'
                          : 'var(--shadow-soft)',
                      padding: '4px 2px',
                      overflow: 'hidden',
                      position: 'relative',
                      transform: isSelectedDay ? 'translateY(-1px) scale(1.02)' : 'translateY(0) scale(1)',
                      transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease',
                    }}
                  >
                    {dayItem ? (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{dayItem.ethDay}</div>
                        <div style={{ fontSize: 8, color: isSelectedDay ? 'var(--accent-strong)' : 'var(--text-secondary)', lineHeight: 1 }}>{dayItem.gregorianDate.day}/{dayItem.gregorianDate.month}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 6 }}>
                          {dayItem.events.slice(0, 2).map((eventItem) => (
                            <span
                              key={eventItem.id}
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: getCalendarEventMeta(eventItem.category).color,
                                boxShadow: '0 0 0 2px color-mix(in srgb, var(--surface-panel) 82%, transparent)',
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

          {calendarModalContext === 'deadline' ? (
            <div style={{ height: 42, borderRadius: 12, border: '1px solid var(--success-border)', padding: '0 12px', fontSize: 12, color: 'var(--success)', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', fontWeight: 800 }}>
              Academic deadline
            </div>
          ) : (
            <select
              value={calendarEventForm.category}
              onChange={(e) => setCalendarEventForm((prev) => ({ ...prev, category: e.target.value, subType: 'general' }))}
              disabled={!canManageCalendar}
              style={{ height: 42, borderRadius: 12, border: '1px solid var(--input-border)', padding: '0 12px', fontSize: 12, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
            >
              <option value="no-class">No class day</option>
              <option value="academic">Academic day</option>
            </select>
          )}

          {calendarModalContext === 'deadline' ? (
            <input
              type="text"
              value={calendarEventForm.title}
              onChange={(e) => setCalendarEventForm((prev) => ({ ...prev, title: e.target.value }))}
              disabled={!canManageCalendar}
              placeholder="Deadline title"
              style={{ height: 42, borderRadius: 12, border: '1px solid var(--input-border)', padding: '0 12px', fontSize: 12, color: 'var(--text-primary)', background: 'var(--input-bg)' }}
            />
          ) : null}

          <textarea
            value={calendarEventForm.notes}
            onChange={(e) => setCalendarEventForm((prev) => ({ ...prev, notes: e.target.value }))}
            disabled={!canManageCalendar}
            placeholder={calendarModalContext === 'deadline' ? 'Optional deadline note' : 'Optional note'}
            rows={3}
            style={{ borderRadius: 12, border: '1px solid var(--input-border)', padding: '12px', fontSize: 12, color: 'var(--text-primary)', background: 'var(--input-bg)', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
            <button
              type="button"
              onClick={handleCreateCalendarEvent}
              disabled={calendarEventSaving || !selectedCalendarDay || !canManageCalendar}
              style={{
                flex: '1 1 180px',
                height: 42,
                borderRadius: 12,
                border: 'none',
                background: calendarEventSaving || !selectedCalendarDay || !canManageCalendar ? 'var(--surface-strong)' : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 900,
                cursor: calendarEventSaving || !selectedCalendarDay || !canManageCalendar ? 'not-allowed' : 'pointer',
                boxShadow: calendarEventSaving || !selectedCalendarDay || !canManageCalendar ? 'none' : '0 12px 18px color-mix(in srgb, var(--accent-strong) 18%, transparent)',
              }}
            >
              {calendarEventSaving ? 'Saving...' : editingCalendarEventId ? 'Update calendar event' : 'Save calendar event'}
            </button>
            <button
              type="button"
              onClick={handleCloseCalendarEventModal}
              style={{ height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border-soft)', background: 'var(--surface-overlay)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
