// backend/jobs/chatProcessorJob.js
import cron from 'node-cron';
import MLToxicityService from '../service/MLToxicityService.js';
import Interaction from '../models/Interaction.js';

class ChatProcessorJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.processedCount = 0;
    this.errorCount = 0;
    
    this.start();
  }

  start() {
    console.log('⏰ Starting automatic chat processor job...');
    
    // Run every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      await this.run();
    });
    
    // Run immediately on startup
    setTimeout(() => this.run(), 15000);
  }

  async run() {
    if (this.isRunning) {
      console.log('⏳ Job already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    console.log(`\n🔔 CHAT PROCESSOR JOB STARTING at ${startTime.toISOString()}`);
    
    try {
      // Check ML API health
      const health = await MLToxicityService.checkHealth();
      
      if (!health.healthy) {
        console.error('❌ ML API not available, skipping job');
        return;
      }

      // Count pending chats
      const pendingCount = await Interaction.countDocuments({
        status: 'completed',
        toxicityAnalyzed: false
      });
      
      console.log(`📊 Found ${pendingCount} pending chats to process`);
      
      if (pendingCount > 0) {
        // Process 3 chats at a time
        const result = await MLToxicityService.processPendingChats(3);
        
        this.processedCount += result.totalProcessed;
        this.errorCount += result.errors.length;
        
        console.log(`✅ Job completed: ${result.totalProcessed} chats processed`);
        console.log(`   Errors: ${result.errors.length}`);
        
        // Log detailed results
        if (result.results.length > 0) {
          console.log('📝 Processed interactions:');
          result.results.forEach(r => {
            console.log(`   - ${r.interactionId}: ${r.success ? '✓' : '✗'} ${r.pointsDeducted || 0} points`);
          });
        }
      } else {
        console.log('✅ No pending chats to process');
      }
      
      this.lastRun = new Date();
      const duration = new Date() - startTime;
      
      console.log(`⏱️  Job duration: ${duration}ms`);
      console.log(`📈 Total processed: ${this.processedCount}, Total errors: ${this.errorCount}`);
      
    } catch (error) {
      console.error(`❌ Job failed: ${error.message}`);
      this.errorCount++;
    } finally {
      this.isRunning = false;
      console.log(`🔔 CHAT PROCESSOR JOB COMPLETED\n`);
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      lastRun: this.lastRun,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      nextRun: 'Every 2 minutes',
      mlApiUrl: MLToxicityService.mlApiUrl
    };
  }
}

export default new ChatProcessorJob();