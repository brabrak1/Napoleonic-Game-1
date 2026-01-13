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
        const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/.test(ua);
        const isTablet = /ipad|tablet|kindle|playbook|silk/.test(ua) ||
                        (ua.includes('android') && !ua.includes('mobile'));

        // Combined check
        const isMobile = hasTouch && (isMobileUA || isTablet);

        return {
            isMobile: isMobile,
            isTablet: isTablet,
            hasTouch: hasTouch,
            platform: this.getPlatform(ua)
        };
    }

    static getPlatform(ua) {
        if (ua.includes('ipad')) return 'iPad';
        if (ua.includes('iphone')) return 'iPhone';
        if (ua.includes('android')) return 'Android';
        if (ua.includes('windows phone')) return 'Windows Phone';
        return 'Desktop';
    }

    static applyMobileClass() {
        const detection = this.detect();
        if (detection.isMobile) {
            document.body.classList.add('mobile-mode');
            if (detection.isTablet) {
                document.body.classList.add('tablet-mode');
            }
        }
        return detection;
    }
}
