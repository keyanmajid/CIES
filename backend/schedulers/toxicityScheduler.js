// backend/schedulers/toxicityScheduler.js
import ToxicityService from '../service/toxicityService.js';
import Interaction from '../models/Interaction.js';

/**
 * Employee-Specific Toxicity Analysis Scheduler
 * Only analyzes chats for specific employees when their chats end
 */
class ToxicityScheduler {
  constructor() {
    this.activeAnalyses = new Map(); // Tracks which employee has active analysis
    console.log('⏰ Employee-Specific Toxicity Scheduler initialized');
  }

  /**
   * Schedule analysis for a specific employee's chat
   * This is called WHEN a chat ends
   */
  async scheduleEmployeeChatAnalysis(employeeId, interactionId) {
    try {
      console.log(`📅 Scheduling toxicity analysis for employee ${employeeId}, chat ${interactionId}`);
      
      // Check if this employee already has analysis running
      if (this.activeAnalyses.has(employeeId)) {
        console.log(`⏳ Employee ${employeeId} already has analysis in progress`);
        return { 
          scheduled: false, 
          reason: 'Already analyzing' 
        };
      }
      
      // Mark as analyzing for this employee
      this.activeAnalyses.set(employeeId, {
        interactionId,
        startedAt: new Date(),
        status: 'scheduled'
      });
      
      // Run the analysis immediately
      console.log(`🔍 STARTING ANALYSIS for employee ${employeeId} on chat ${interactionId}`);
      
      const result = await ToxicityService.analyzeInteraction(interactionId);
      
      // Clear the tracking
      this.activeAnalyses.delete(employeeId);
      
      console.log(`✅ ANALYSIS COMPLETE for employee ${employeeId}:`, {
        success: result.success,
        pointsDeducted: result.pointsDeducted,
        toxicMessages: result.analysis?.toxic_messages
      });
      
      return {
        scheduled: true,
        employeeId,
        interactionId,
        result
      };
      
    } catch (error) {
      console.error(`❌ Failed to analyze chat for employee ${employeeId}:`, error.message);
      
      // Clear tracking on error
      this.activeAnalyses.delete(employeeId);
      
      return {
        scheduled: false,
        employeeId,
        error: error.message
      };
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      activeAnalyses: Array.from(this.activeAnalyses.entries()).map(([empId, data]) => ({
        employeeId: empId,
        interactionId: data.interactionId,
        status: data.status,
        startedAt: data.startedAt
      })),
      totalActive: this.activeAnalyses.size
    };
  }

  /**
   * Check if employee has analysis running
   */
  isEmployeeBeingAnalyzed(employeeId) {
    return this.activeAnalyses.has(employeeId);
  }

  /**
   * Cancel analysis for an employee
   */
  cancelEmployeeAnalysis(employeeId) {
    if (this.activeAnalyses.has(employeeId)) {
      this.activeAnalyses.delete(employeeId);
      console.log(`🛑 Cancelled analysis for employee ${employeeId}`);
      return true;
    }
    return false;
  }
}

// Export singleton
export default new ToxicityScheduler();