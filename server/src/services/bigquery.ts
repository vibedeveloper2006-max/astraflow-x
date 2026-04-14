import { BigQuery } from '@google-cloud/bigquery';
import { Zone } from '../types';
import { logger } from '../utils/logger';

const bigquery = new BigQuery();
const DATASET_ID = 'astraflow_analytics';
const TABLE_ID = 'zone_occupancy_logs';

/**
 * Service to stream crowd data to Google BigQuery for long-term analytics.
 * Demonstrates advanced Google Service integration.
 */
export class BigQueryService {
  private static isInitialized = false;

  /**
   * Ensures the dataset and table exist in BigQuery.
   */
  private static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (process.env.NODE_ENV !== 'production') {
        logger.info('BigQuery: Running in development mode, skipping initialization');
        this.isInitialized = true;
        return;
      }

      const [datasets] = await bigquery.getDatasets();
      if (!datasets.find((d) => d.id === DATASET_ID)) {
        await bigquery.createDataset(DATASET_ID);
        logger.info(`BigQuery: Created dataset ${DATASET_ID}`);
      }

      const dataset = bigquery.dataset(DATASET_ID);
      const [tables] = await dataset.getTables();
      if (!tables.find((t) => t.id === TABLE_ID)) {
        const schema = [
          { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'zone_id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'zone_name', type: 'STRING' },
          { name: 'occupancy', type: 'INTEGER' },
          { name: 'capacity', type: 'INTEGER' },
          { name: 'occupancy_ratio', type: 'FLOAT' },
          { name: 'status', type: 'STRING' },
          { name: 'risk_score', type: 'FLOAT' },
        ];
        await dataset.createTable(TABLE_ID, { schema });
        logger.info(`BigQuery: Created table ${TABLE_ID}`);
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('BigQuery: Initialization failed', { error: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  /**
   * Streams current zone data to BigQuery.
   * @param zones Array of current zones with live metrics.
   */
  static async streamZoneData(zones: Zone[]): Promise<void> {
    await this.initialize();

    if (process.env.NODE_ENV !== 'production') return;

    try {
      const rows = zones.map((z) => ({
        timestamp: bigquery.timestamp(new Date()),
        zone_id: z.id,
        zone_name: z.name,
        occupancy: z.currentOccupancy,
        capacity: z.capacity,
        occupancy_ratio: z.currentOccupancy / z.capacity,
        status: z.status,
        risk_score: z.riskScore,
      }));

      await bigquery.dataset(DATASET_ID).table(TABLE_ID).insert(rows);
      logger.debug(`BigQuery: Streamed ${rows.length} rows to analytics`);
    } catch (error) {
      // BigQuery insert errors can be complex, log the details
      const e = error as any;
      if (e.errors) {
        logger.error('BigQuery: Insert failed', { errors: e.errors });
      } else {
        logger.error('BigQuery: Stream failed', { error: e.message });
      }
    }
  }
}
