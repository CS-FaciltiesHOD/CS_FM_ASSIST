(function() {
    // FM Assist Widget Loader
    const CONFIG = {
        baseUrl: 'https://cs-fm-assist.vercel.app',
        width: '420px',
        height: '650px',
        margin: '24px'
    };

    // Create container
    const container = document.createElement('div');
    container.id = 'fm-widget-root';
    document.body.appendChild(container);

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${CONFIG.baseUrl}/embed.html`;
    iframe.style.position = 'fixed';
    iframe.style.bottom = CONFIG.margin;
    iframe.style.right = CONFIG.margin;
    iframe.style.width = CONFIG.width;
    iframe.style.height = CONFIG.height;
    iframe.style.border = 'none';
    iframe.style.zIndex = '100000';
    iframe.style.borderRadius = '24px';
    iframe.style.boxShadow = '0 8px 48px rgba(10,31,68,.14)';
    iframe.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    // Handle mobile responsiveness
    const updateSize = () => {
        if (window.innerWidth < 480) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.bottom = '0';
            iframe.style.right = '0';
            iframe.style.borderRadius = '0';
            iframe.style.margin = '0';
        } else {
            iframe.style.width = CONFIG.width;
            iframe.style.height = CONFIG.height;
            iframe.style.bottom = CONFIG.margin;
            iframe.style.right = CONFIG.margin;
            iframe.style.borderRadius = '24px';
        }
    };

    window.addEventListener('resize', updateSize);
    updateSize();

    // Listen for messages from the widget (e.g. to resize or close)
    window.addEventListener('message', (event) => {
        if (event.origin !== CONFIG.baseUrl) return;

        if (event.data === 'fm-widget-close') {
            // Optional: handle closing if we had a toggle
        }
    });

    container.appendChild(iframe);
    console.log('FM Assist Widget Loaded');
})();
