/**
 * MobileDetector.js
 * Utility to detect mobile/tablet devices and set global flags
 */
class MobileDetector {
    static detect() {
        // Check touch capability
        const hasTouch = ('ontouchstart' in window) ||
                        (navigator.maxTouchPoints > 0) ||
                        (navigator.msMaxTouchPoints > 0);

        // Check user agent for mobile/tablet
        const ua = navigator.userAgent.toLowerCase();

        // iOS 13+ iPad detection workaround
        // Modern iPads report as "Macintosh" but have maxTouchPoints > 0
        const isMacTouch = ua.includes('mac') && navigator.maxTouchPoints > 1;

        const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/.test(ua);
        const isTablet = /ipad|tablet|kindle|playbook|silk/.test(ua) ||
                        (ua.includes('android') && !ua.includes('mobile')) ||
                        isMacTouch; // Detect iPad with desktop UA

        // RELAXED CHECK: Prioritize touch capability over UA string
        // If device has touch AND looks like a tablet, treat as mobile
        const isMobile = hasTouch && (isMobileUA || isTablet);

        // Additional check: Any touch-enabled device should get mobile mode
        const forceMobile = hasTouch && window.innerWidth <= 1024;

        return {
            isMobile: isMobile || forceMobile,
            isTablet: isTablet,
            hasTouch: hasTouch,
            platform: this.getPlatform(ua, isMacTouch)
        };
    }

    static getPlatform(ua, isMacTouch) {
        if (isMacTouch) return 'iPad'; // iOS 13+ iPad
        if (ua.includes('ipad')) return 'iPad';
        if (ua.includes('iphone')) return 'iPhone';
        if (ua.includes('android')) return 'Android';
        if (ua.includes('windows phone')) return 'Windows Phone';
        return 'Desktop';
    }

    static applyMobileClass() {
        const detection = this.detect();

        // DEBUG LOGGING
        console.log('[Mobile Detection] User Agent:', navigator.userAgent);
        console.log('[Mobile Detection] Has Touch:', detection.hasTouch);
        console.log('[Mobile Detection] Max Touch Points:', navigator.maxTouchPoints);
        console.log('[Mobile Detection] Screen Width:', window.innerWidth);
        console.log('[Mobile Detection] Is Mobile:', detection.isMobile);
        console.log('[Mobile Detection] Is Tablet:', detection.isTablet);
        console.log('[Mobile Detection] Platform:', detection.platform);

        if (detection.isMobile) {
            document.body.classList.add('mobile-mode');
            console.log('[Mobile Detection] ✅ Applied mobile-mode class');
            if (detection.isTablet) {
                document.body.classList.add('tablet-mode');
                console.log('[Mobile Detection] ✅ Applied tablet-mode class');
            }
        } else {
            console.log('[Mobile Detection] ❌ NOT mobile - desktop mode');
        }

        return detection;
    }
}
