import { useState, useMemo } from 'react';

export default function StatsCalendar({ items = [], onClose }) {
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Defensive Helper for Date Parsing
    const safeDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d;
    };

    // Helper to strip time and compare dates
    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    // Generate calendar grid
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(selectedDate);
    const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Calculate Stats for Selected Day
    const dailyStats = useMemo(() => {
        // Filter items for the selected day safely
        const dayItems = items.filter(item => {
            const d = safeDate(item.created_at);
            return d && isSameDay(d, selectedDate);
        });

        // 1. YouTube Count (Videos + Shorts)
        // Check for 'youtube' in URL OR 'YouTube' in Category name
        const youtubeCount = dayItems.filter(i =>
            (i.url?.includes('youtube') || i.url?.includes('youtu.be')) ||
            (i.category?.includes('YouTube'))
        ).length;

        // 2. Instagram Count (Reels + Posts)
        // Check for 'instagram' in URL OR 'Instagram' in Category name
        const instaCount = dayItems.filter(i =>
            (i.url?.includes('instagram')) ||
            (i.category?.includes('Instagram'))
        ).length;

        // 3. Captured Count (Photos + Videos not from socials)
        const capturedCount = dayItems.filter(i =>
            i.type === 'photo' ||
            (i.type === 'video' && !i.url?.includes('youtube.com') && !i.url?.includes('youtu.be') && !i.url?.includes('instagram.com'))
        ).length;

        return {
            total: dayItems.length,
            youtube: youtubeCount,
            instagram: instaCount,
            captured: capturedCount,
            items: dayItems
        };
    }, [selectedDate, items]);

    // Pre-calculate activity for the whole month to show dots/indicators
    const monthActivity = useMemo(() => {
        const activityMap = {};
        if (!items) return activityMap;

        items.forEach(item => {
            const d = safeDate(item.created_at);
            if (d && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear()) {
                const day = d.getDate();
                activityMap[day] = (activityMap[day] || 0) + 1;
            }
        });
        return activityMap;
    }, [items, selectedDate]);

    const changeMonth = (offset) => {
        const newDate = new Date(selectedDate.setMonth(selectedDate.getMonth() + offset));
        setSelectedDate(new Date(newDate));
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>📅 Activity Cloud</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#fff' }}>✕</button>
                </div>

                {/* Calendar Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 1rem' }}>
                    <button onClick={() => changeMonth(-1)} className="icon-btn">◀</button>
                    <h3 style={{ margin: 0 }}>{monthName}</h3>
                    <button onClick={() => changeMonth(1)} className="icon-btn">▶</button>
                </div>

                {/* Calendar Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '5px',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{d}</div>
                    ))}

                    {/* Empty slots for start of month */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {/* Days */}
                    {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1;
                        const isSelected = day === selectedDate.getDate();
                        const hasActivity = monthActivity[day] > 0;
                        const isToday = isSameDay(new Date(), new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day));

                        return (
                            <div
                                key={day}
                                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                                style={{
                                    padding: '8px',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    background: isSelected ? 'var(--accent-primary)' : (isToday ? 'rgba(255,255,255,0.05)' : 'transparent'),
                                    color: isSelected ? 'white' : 'var(--text-primary)',
                                    border: isToday && !isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                                    position: 'relative'
                                }}
                            >
                                {day}
                                {hasActivity && !isSelected && (
                                    <div style={{
                                        width: '4px', height: '4px',
                                        borderRadius: '50%', background: 'var(--accent-secondary)',
                                        position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)'
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Stats Panel */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '1rem',
                    border: '1px solid var(--border-color)'
                }}>
                    <h4 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Stats for {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{dailyStats.total} Total</span>
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '1rem', background: '#FF000015', borderRadius: '10px',
                            border: '1px solid #FF000030'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>📺</span>
                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '0.25rem' }}>{dailyStats.youtube}</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>YouTube</span>
                        </div>

                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '1rem', background: '#C1358415', borderRadius: '10px',
                            border: '1px solid #C1358430'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>📸</span>
                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '0.25rem' }}>{dailyStats.instagram}</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Instagram</span>
                        </div>
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '1rem', background: '#10b98115', borderRadius: '10px',
                            border: '1px solid #10b98130'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>🤳</span>
                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '0.25rem' }}>{dailyStats.captured}</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Captured</span>
                        </div>
                    </div>

                    {dailyStats.items.length > 0 && (
                        <div style={{ marginTop: '1rem', maxHeight: '150px', overflowY: 'auto' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>History:</div>
                            {dailyStats.items.map(item => (
                                <div key={item.id} style={{
                                    fontSize: '0.85rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                    {item.category === 'Music' ? '🎵' : item.category === 'Movies' ? '🎬' : '📄'}
                                    {item.type === 'secret' ? '🔒 Secret Item' : (item.title || 'Untitled')}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
