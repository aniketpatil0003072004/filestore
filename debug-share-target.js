// Add this to your browser console to debug Share Target
// Go to video.aiproctor.store and paste this in DevTools Console

console.log('🔍 Vaultify - Share Target Debugger\n');

// Check if running as PWA
const isPWA = window.matchMedia('(display-mode: standalone)').matches;
console.log(`📱 Running as PWA: ${isPWA ? '✅ YES' : '❌ NO (Install first!)'}`);

// Check Service Worker
navigator.serviceWorker.getRegistration().then(reg => {
    if (reg) {
        console.log('✅ Service Worker: Registered');
        console.log('   Scope:', reg.scope);
        console.log('   Active:', reg.active ? '✅ YES' : '❌ NO');
    } else {
        console.log('❌ Service Worker: Not registered');
    }
});

// Check Manifest
fetch('/manifest.json')
    .then(r => r.json())
    .then(manifest => {
        console.log('✅ Manifest loaded');
        console.log('   Name:', manifest.name);
        console.log('   Share Target:', manifest.share_target ? '✅ Configured' : '❌ Not configured');
        if (manifest.share_target) {
            console.log('   Action:', manifest.share_target.action);
            console.log('   Method:', manifest.share_target.method);
            console.log('   Params:', manifest.share_target.params);
        }
    })
    .catch(e => console.log('❌ Manifest error:', e));

// Check URL params (if shared)
const params = new URLSearchParams(window.location.search);
const sharedUrl = params.get('url') || params.get('text');
if (sharedUrl) {
    console.log('✅ Shared URL detected:', sharedUrl);
} else {
    console.log('ℹ️  No shared URL in current page');
}

// Check HTTPS
console.log(`🔒 HTTPS: ${window.location.protocol === 'https:' ? '✅ YES' : '❌ NO'}`);

// Check Chrome version (if available)
const userAgent = navigator.userAgent;
const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
if (chromeMatch) {
    const version = parseInt(chromeMatch[1]);
    console.log(`🌐 Chrome version: ${version} ${version >= 89 ? '✅ OK' : '❌ Too old (need 89+)'}`);
}

console.log('\n📋 Share Target Requirements:');
console.log('1. ✅ HTTPS (or localhost)');
console.log('2. ✅ PWA installed');
console.log('3. ✅ Service Worker active');
console.log('4. ✅ Manifest with share_target');
console.log('5. ⏱️  Wait 5-15 minutes after install');
console.log('6. 🔄 Restart Chrome');
console.log('\nIf all ✅ but still not working:');
console.log('- Try chrome://flags → Enable "Web Share Target"');
console.log('- Restart phone');
console.log('- Check Android version (need 10+)');
