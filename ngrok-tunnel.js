const localtunnel = require('localtunnel');

(async function() {
  try {
    const tunnel = await localtunnel({ 
      port: 5000,
      subdomain: 'bar-mis-' + Math.random().toString(36).substr(2, 9) // random subdomain
    });
    
    console.log('\n🚀 LocalTunnel established!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Public URL: ${tunnel.url}`);
    console.log(`🔗 Webhook URL: ${tunnel.url}/api/leads/webhook`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Use this URL in your Elementor webhook settings');
    console.log('⚠️  Make sure your server is running on port 5000');
    console.log('\nPress Ctrl+C to stop the tunnel\n');
    
    tunnel.on('close', () => {
      console.log('\n🛑 Tunnel closed');
    });
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Closing tunnel...');
      tunnel.close();
      process.exit();
    });
    
  } catch (error) {
    console.error('❌ Error starting tunnel:', error);
    console.error('\n💡 Tip: Make sure port 5000 is not already in use');
    process.exit(1);
  }
})();
