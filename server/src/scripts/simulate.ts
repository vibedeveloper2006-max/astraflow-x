import dotenv from 'dotenv';
import axios from 'axios';
import { logger } from '../utils/logger';

dotenv.config({ path: '../.env' });
dotenv.config();

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runSimulation() {
  logger.info('🚀 Starting AstraFlow X CLI Simulation...');
  
  try {
    // 1. Health check
    await axios.get(`${BASE_URL}/health`);
    logger.info('✅ API is healthy');

    // 2. Start simulation loop
    logger.info('🔄 Triggering simulation engine...');
    const startRes = await axios.post(`${BASE_URL}/simulation/start`, {
      eventType: 'match_start',
      speed: 1.0
    });
    
    if (startRes.data.success) {
      logger.info('📈 Simulation loop active. Event: match_start');
    }

    // 3. Monitor for a few seconds
    logger.info('📊 Monitoring zone updates (10 seconds)...');
    
    for (let i = 0; i < 5; i++) {
      const zonesRes = await axios.get(`${BASE_URL}/zones`);
      const totalOcc = zonesRes.data.data.zones.reduce((sum: number, z: any) => sum + z.currentOccupancy, 0);
      const criticalCount = zonesRes.data.data.zones.filter((z: any) => z.status === 'critical').length;
      
      logger.info(`[Tick ${i+1}] Total Occupancy: ${totalOcc} | Critical Zones: ${criticalCount}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 4. Test AI Chat context
    logger.info('🤖 Testing AI context extraction...');
    const chatRes = await axios.post(`${BASE_URL}/ai/chat`, {
      message: 'Which zone has the highest risk right now and what should I do?'
    });
    logger.info(`🤖 AI Response: ${chatRes.data.data.reply.substring(0, 100)}...`);

    logger.info('✅ CLI Simulation check complete');
    process.exit(0);
  } catch (error: any) {
    if (error.response?.status === 401) {
      logger.warn('⚠️ Firebase Auth is enabled. Simulation script cannot bypass authentication. Skipping endpoint tests.');
      process.exit(0);
    }
    
    logger.error('❌ Simulation check failed');
    if (error.response) {
      logger.error(`Status: ${error.response.status}`, { data: error.response.data });
    } else {
      logger.error(error.message || 'Unknown error');
    }
    process.exit(1);
  }
}

runSimulation();
