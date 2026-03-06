# Live Broadcast Section (بث مباشر)

## Summary
Embed Al Jazeera Arabic and Al Hadath 24/7 YouTube live streams into the sidebar, with responsive reflow to above-the-feed on mobile.

## Placement
- **Desktop/tablet**: Sidebar, stacked vertically above or below existing "آخر الأخبار" list
- **Mobile (<768px)**: Moves above `#feed` in the main content area, full width

## Layout
Two iframes stacked vertically, each with:
- Channel label (الجزيرة / الحدث)
- 16:9 aspect ratio
- `autoplay=1&mute=1` params
- Divider between players

## YouTube Embed URLs
- Al Jazeera Arabic: `https://www.youtube.com/embed/live_stream?channel=UCBvIYJlGkSMt5qDBal4wkVw&autoplay=1&mute=1`
- Al Hadath: `https://www.youtube.com/embed/live_stream?channel=UCGuMSdOmyfrc1UlFbfSMEcw&autoplay=1&mute=1`

## Responsive Behavior
- **>1024px**: Both in sidebar (~300px wide)
- **768-1024px**: Same, narrower sidebar
- **<768px**: Full-width section above feed, stacked, with "بث مباشر" title

## Section Title
"بث مباشر" with pulsing red dot, styled like `.section-title`

## Implementation Notes
- Pure HTML/CSS, no new JS logic
- Iframes load immediately (no click-to-load)
- Zero Railway egress impact (video streams from YouTube CDN)
- All changes in `frontend/public/index.html`
