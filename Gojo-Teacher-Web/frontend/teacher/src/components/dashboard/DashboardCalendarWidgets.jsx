import React from "react";
import { FaCalendarAlt, FaPlus } from "react-icons/fa";

function DashboardCalendarWidgets({
  compactCards,
  widgetCardStyle,
  rightRailCardStyle,
  rightRailIconStyle,
  rightRailIconButtonStyle,
  rightRailPillStyle,
  softPanelStyle,
  canManageCalendar,
  calendarMonthLabel,
  calendarMonthStartGregorian,
  calendarMonthEndGregorian,
  CALENDAR_WEEK_DAYS,
  calendarDays,
  calendarHighlightedDay,
  selectedCalendarIsoDate,
  hoveredCalendarIsoDate,
  setSelectedCalendarIsoDate,
  setHoveredCalendarIsoDate,
  getCalendarEventMeta,
  monthlyCalendarEvents,
  calendarActionMessage,
  calendarErrorMessage,
  selectedCalendarDay,
  calendarViewDate,
  ETHIOPIAN_MONTHS,
  calendarEventsLoading,
  selectedCalendarEvents,
  handleCalendarMonthChange,
  handleOpenCalendarEventModal,
  handleEditCalendarEvent,
  handleDeleteCalendarEvent,
  pendingDeleteEvent,
  handleConfirmedDelete,
  setPendingDeleteEvent,
  calendarModalContext,
  calendarEventForm,
  setCalendarEventForm,
  calendarEventSaving,
  editingCalendarEventId,
  handleCreateCalendarEvent,
  handleCloseCalendarEventModal,
  upcomingDeadlineEvents,
  visibleUpcomingDeadlineEvents,
  formatCalendarDeadlineDate,
  showAllUpcomingDeadlines,
  setShowAllUpcomingDeadlines,
  handleOpenDeadlineModal,
}) {
  return (
    <>
      <div style={{ ...rightRailCardStyle, overflow: "hidden", position: "relative" }}>
        <div style={{ padding: compactCards ? "12px 12px 10px" : "14px 14px 12px", background: "var(--surface-panel)", borderBottom: "1px solid rgba(15, 23, 42, 0.08)", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={rightRailIconStyle}>
                <FaCalendarAlt style={{ width: 14, height: 14 }} />
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>School Calendar</h4>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3, fontWeight: 800 }}>{calendarMonthLabel}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, fontWeight: 500 }}>
                  {`${calendarMonthStartGregorian.day}/${calendarMonthStartGregorian.month}/${calendarMonthStartGregorian.year} - ${calendarMonthEndGregorian.day}/${calendarMonthEndGregorian.month}/${calendarMonthEndGregorian.year}`}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => handleCalendarMonthChange(-1)}
                style={{ ...rightRailIconButtonStyle, fontSize: 17 }}
                aria-label="Previous month"
                title="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => handleCalendarMonthChange(1)}
                style={{ ...rightRailIconButtonStyle, fontSize: 17 }}
                aria-label="Next month"
                title="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div style={{ ...rightRailPillStyle, color: "var(--text-primary)" }}>
                {monthlyCalendarEvents.length} event{monthlyCalendarEvents.length === 1 ? "" : "s"}
              </div>
              <div style={{ ...rightRailPillStyle, color: canManageCalendar ? "var(--text-primary)" : "var(--text-secondary)" }}>
                {canManageCalendar ? "Manage access" : "View only"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ margin: compactCards ? "10px" : "12px", background: "#F8FAFC", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 12, padding: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 6 }}>
            {CALENDAR_WEEK_DAYS.map((day) => (
              <div key={day} style={{ textAlign: "center", fontSize: 9, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
            {calendarDays.map((day, index) => {
              const isToday = day?.ethDay === calendarHighlightedDay;
              const dayOfWeek = index % 7;
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const primaryEvent = day?.events?.[0] || null;
              const isNoClassDay = primaryEvent?.category === "no-class";
              const isAcademicDay = primaryEvent?.category === "academic";
              const isSelected = day?.isoDate === selectedCalendarIsoDate;
              const isHovered = day?.isoDate === hoveredCalendarIsoDate;
              const dayBackground = day
                ? isToday
                  ? "var(--accent-soft)"
                  : isSelected
                    ? "color-mix(in srgb, var(--accent-soft) 72%, white 28%)"
                    : isNoClassDay
                      ? "color-mix(in srgb, var(--warning-soft) 58%, white 42%)"
                      : isAcademicDay
                        ? "color-mix(in srgb, var(--accent-soft) 46%, white 54%)"
                        : isWeekend
                          ? "color-mix(in srgb, var(--surface-muted) 82%, white 18%)"
                          : "var(--surface-panel)"
                : "transparent";

              return (
                <button
                  type="button"
                  key={`${day?.ethDay || "blank"}-${index}`}
                  onClick={() => day && setSelectedCalendarIsoDate(day.isoDate)}
                  onMouseEnter={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                  onMouseLeave={() => setHoveredCalendarIsoDate("")}
                  onFocus={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                  onBlur={() => setHoveredCalendarIsoDate("")}
                  title={day?.events?.length ? day.events.map((eventItem) => eventItem.title).join(", ") : ""}
                  style={{
                    minHeight: 0,
                    aspectRatio: "1 / 1",
                    borderRadius: 10,
                    border: isToday
                      ? "1px solid var(--accent)"
                      : isSelected
                        ? "1px solid var(--accent-strong)"
                        : isHovered
                          ? "1px solid var(--border-strong)"
                              : isNoClassDay
                                ? "1px solid var(--warning-border)"
                                : "1px solid var(--border-soft)",
                    background: dayBackground,
                    color: isToday ? "var(--accent-strong)" : day ? "var(--text-secondary)" : "transparent",
                    fontSize: 10,
                    fontWeight: isToday ? 800 : 700,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    padding: "5px 2px",
                    boxShadow: day && isSelected ? "0 8px 18px rgba(0, 122, 251, 0.12)" : "none",
                    cursor: day ? "pointer" : "default",
                    outline: "none",
                    transform: day && isSelected
                      ? "translateY(-2px) scale(1.03)"
                      : day && isHovered
                        ? "translateY(-1px)"
                        : "translateY(0)",
                    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  disabled={!day}
                >
                  {day ? (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 800, color: isToday || isSelected ? "var(--accent-strong)" : "var(--text-primary)", lineHeight: 1 }}>{day.ethDay}</div>
                      <div style={{ fontSize: 8, color: isSelected ? "var(--accent)" : "var(--text-muted)", lineHeight: 1 }}>{day.gregorianDate.day}/{day.gregorianDate.month}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 2, minHeight: 6 }}>
                        {day.events.slice(0, 2).map((eventItem) => (
                          <span
                            key={eventItem.id}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: getCalendarEventMeta(eventItem.category).color,
                            }}
                          />
                        ))}
                      </div>
                    </>
                  ) : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "0 12px 0", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "var(--text-secondary)", fontWeight: 800, background: "#F8FAFC", border: "1px solid rgba(220, 38, 38, 0.18)", borderRadius: 999, padding: "5px 8px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)" }} /> No class
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "var(--text-secondary)", fontWeight: 800, background: "#F8FAFC", border: "1px solid rgba(0, 122, 251, 0.18)", borderRadius: 999, padding: "5px 8px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} /> Academic
          </div>
          {canManageCalendar ? (
            <button
              type="button"
              onClick={handleOpenCalendarEventModal}
              style={{ ...rightRailIconButtonStyle, width: 30, height: 30, borderRadius: 999, color: "var(--text-primary)" }}
              aria-label="Add school calendar event"
              title="Add school calendar event"
            >
              <FaPlus style={{ width: 12, height: 12 }} />
            </button>
          ) : null}
        </div>

        {calendarActionMessage ? (
          <div style={{ margin: "10px 12px 0", borderRadius: 12, border: "1px solid rgba(0, 122, 251, 0.12)", background: "#F8FAFC", color: "var(--text-primary)", fontSize: 10, fontWeight: 800, padding: "8px 10px" }}>
            {calendarActionMessage}
          </div>
        ) : null}

        {calendarErrorMessage ? (
          <div style={{ margin: "10px 12px 0", borderRadius: 12, border: "1px solid var(--danger-border)", background: "var(--warning-soft)", color: "var(--danger)", fontSize: 10, fontWeight: 800, padding: "8px 10px" }}>
            {calendarErrorMessage}
          </div>
        ) : null}

        <div style={{ margin: "12px", background: "#F8FAFC", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 12, padding: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-primary)" }}>
                {selectedCalendarDay
                  ? `${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]} ${selectedCalendarDay.ethDay}, ${calendarViewDate.year}`
                  : "Select a date"}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                {selectedCalendarDay
                  ? `Gregorian ${selectedCalendarDay.gregorianDate.day}/${selectedCalendarDay.gregorianDate.month}/${selectedCalendarDay.gregorianDate.year}`
                  : "Choose a day to view or add calendar events."}
              </div>
            </div>
            {calendarEventsLoading && (
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700 }}>Loading...</div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {selectedCalendarEvents.length === 0 ? (
              <div style={{ fontSize: 9, color: "var(--text-muted)", background: "var(--surface-muted)", borderRadius: 10, border: "1px solid var(--border-soft)", padding: "7px 9px" }}>
                No school events on this day.
              </div>
            ) : (
              selectedCalendarEvents.map((eventItem) => {
                const eventMeta = getCalendarEventMeta(eventItem.category);

                return (
                  <div
                    key={eventItem.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 7,
                      background: "var(--surface-panel)",
                      border: `1px solid ${eventMeta.border}`,
                      borderRadius: 10,
                      padding: "7px 8px",
                    }}
                  >
                    <span style={{ width: 8, height: 8, marginTop: 4, borderRadius: "50%", background: eventMeta.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-primary)" }}>{eventItem.title}</div>
                        {eventItem.isDefault ? (
                          <span style={{ padding: "2px 6px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-strong)", fontSize: 9, fontWeight: 800 }}>Default</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{eventMeta.label}</div>
                      {eventItem.notes ? (
                        <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 3 }}>{eventItem.notes}</div>
                      ) : null}
                    </div>
                    {canManageCalendar && !eventItem.isDefault ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleEditCalendarEvent(eventItem)}
                          style={{ height: 26, padding: "0 9px", borderRadius: 8, border: "1px solid var(--border-soft)", background: "var(--surface-panel)", color: "var(--text-secondary)", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCalendarEvent(eventItem)}
                          style={{ height: 26, padding: "0 9px", borderRadius: 8, border: "1px solid var(--danger-border)", background: "var(--surface-panel)", color: "var(--danger)", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
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

        {pendingDeleteEvent ? (
          <div style={{ margin: "10px 12px", padding: "10px", borderRadius: 10, border: "1px solid var(--danger-border)", background: "var(--warning-soft)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>
              Delete {getCalendarEventMeta(pendingDeleteEvent.category).label} on {" "}
              {pendingDeleteEvent.gregorianDate}?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  handleConfirmedDelete(pendingDeleteEvent);
                  setPendingDeleteEvent(null);
                }}
                style={{ height: 28, padding: "0 12px", borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: "pointer", background: "var(--danger)", color: "#fff", border: "none" }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteEvent(null)}
                style={{ height: 28, padding: "0 12px", borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: "pointer", background: "var(--surface-panel)", color: "var(--text-primary)", border: "1px solid var(--border-soft)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ ...widgetCardStyle, padding: compactCards ? "10px" : "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Upcoming Deadlines</h4>
          {canManageCalendar ? (
            <button
              type="button"
              onClick={handleOpenDeadlineModal}
              style={{ ...rightRailIconButtonStyle, borderRadius: 999, color: "var(--text-primary)" }}
              aria-label="Add upcoming deadline"
              title="Add upcoming deadline"
            >
              <FaPlus style={{ width: 11, height: 11 }} />
            </button>
          ) : null}
        </div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {calendarEventsLoading ? (
            <div style={{ padding: "8px 9px", borderRadius: 10, border: "1px solid rgba(15, 23, 42, 0.06)", background: "#F8FAFC", fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>
              Loading deadlines...
            </div>
          ) : upcomingDeadlineEvents.length === 0 ? (
            <div style={{ padding: "8px 9px", borderRadius: 10, border: "1px solid rgba(15, 23, 42, 0.06)", background: "#F8FAFC", fontSize: 10, color: "var(--text-muted)" }}>
              No upcoming deadlines in the next 30 days.
              {canManageCalendar ? (
                <button
                  type="button"
                  onClick={handleOpenDeadlineModal}
                  style={{ marginTop: 8, height: 28, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(15, 23, 42, 0.08)", background: "var(--surface-panel)", color: "var(--text-primary)", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
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
                    padding: "8px 9px",
                    borderRadius: 10,
                    border: `1px solid ${eventMeta.border}`,
                    background: "#F8FAFC",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: eventMeta.color, flexShrink: 0 }} />
                      <span>{eventItem.title?.trim() || eventItem.notes?.trim() || "Academic deadline"}</span>
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}>
                      {eventMeta.label}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
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
              style={{ alignSelf: "flex-start", height: 28, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(15, 23, 42, 0.08)", background: "var(--surface-panel)", color: "var(--text-primary)", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
            >
              {showAllUpcomingDeadlines ? "See less" : `See more (${upcomingDeadlineEvents.length - 3})`}
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ ...widgetCardStyle, padding: compactCards ? "10px" : "12px" }}>
        <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Sponsored Links</h4>
        <ul style={{ margin: "10px 0 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7, fontSize: 13 }}>
          <li style={{ ...softPanelStyle, color: "var(--text-primary)", fontWeight: 700, padding: "8px 10px" }}>Gojo Study App</li>
          <li style={{ ...softPanelStyle, color: "var(--text-primary)", fontWeight: 700, padding: "8px 10px" }}>Finance Portal</li>
          <li style={{ ...softPanelStyle, color: "var(--text-primary)", fontWeight: 700, padding: "8px 10px" }}>HR Management</li>
        </ul>
      </div>
    </>
  );
}

export default DashboardCalendarWidgets;
