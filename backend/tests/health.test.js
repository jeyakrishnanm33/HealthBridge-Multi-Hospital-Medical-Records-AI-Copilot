const request = require('supertest');
const app = require('../src/app');

describe('HealthBridge Backend Foundation Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 and health status structure', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        status: 'ok',
        service: 'healthbridge-api',
        version: '0.1.0',
      });
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data.database).toHaveProperty('connected');
    });
  });

  describe('404 Not Found Handling', () => {
    it('should return 404 with structured JSON for unmatched routes', async () => {
      const response = await request(app).get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
        },
      });
      expect(response.body.error.message).toContain('Cannot GET /api/non-existent-endpoint');
    });
  });

  describe('CORS and JSON Headers', () => {
    it('should respond with application/json content type', async () => {
      const response = await request(app).get('/api/health');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
