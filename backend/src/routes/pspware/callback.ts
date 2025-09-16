import { Elysia, t } from 'elysia';
import { pspwareAdapterService } from '@/services/pspware-adapter.service';
import { db } from '@/db';

export default new Elysia()
  .post(
    '/callback/:aggregatorId',
    async ({ params, body, headers, error }) => {
      try {
        console.log(`[PSPWare Callback] Received callback for aggregator ${params.aggregatorId}:`, body);
        
        // Handle both nested and direct data formats
        const callbackData = (body as any).data || body;
        
        // Validate aggregator exists
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.aggregatorId }
        });
        
        if (!aggregator) {
          console.error(`[PSPWare Callback] Aggregator ${params.aggregatorId} not found`);
          return error(404, { error: 'Aggregator not found' });
        }
        
        // PSPWare не требует API ключ для callback'ов
        const apiKey = headers['x-api-key'] || 'NO_KEY';
        
        // Log incoming callback to API logs
        const startTime = Date.now();
        
        // Process callback
        const result = await pspwareAdapterService.handleCallback(callbackData, params.aggregatorId);
        
        const responseTime = Date.now() - startTime;
        
        // Log callback to AggregatorIntegrationLog
        await db.aggregatorIntegrationLog.create({
          data: {
            aggregatorId: params.aggregatorId,
            direction: 'IN' as any,
            eventType: 'pspware_callback',
            method: 'POST',
            url: `/api/pspware/callback/${params.aggregatorId}`,
            headers: {
              'x-api-key': apiKey ? '[PRESENT]' : '[MISSING]',
              'content-type': headers['content-type'] || 'application/json'
            },
            requestBody: body as any,
            responseBody: result as any,
            statusCode: result.success ? 200 : 400,
            responseTimeMs: responseTime,
            ourDealId: callbackData.id,
            error: result.success ? null : result.message
          }
        });

        // Also log to AggregatorCallbackLog for the new Callback Logs tab
        try {
          await db.aggregatorCallbackLog.create({
            data: {
              aggregatorId: params.aggregatorId,
              type: 'pspware_v2_status_update',
              payload: body as any,
              response: result.success ? 'OK' : result.message,
              statusCode: result.success ? 200 : 400,
              error: result.success ? null : result.message
            }
          });
        } catch (callbackLogError) {
          console.error('Failed to log to AggregatorCallbackLog:', callbackLogError);
        }
        
        if (result.success) {
          console.log(`[PSPWare Callback] Successfully processed callback for order ${callbackData.id}`);
          return { status: 'OK', message: result.message };
        } else {
          console.error(`[PSPWare Callback] Failed to process callback: ${result.message}`);
          return error(400, { response: result.message });
        }
      } catch (err) {
        console.error('[PSPWare Callback] Error processing callback:', err);
        return error(500, { error: 'Internal server error' });
      }
    },
    {
      params: t.Object({
        aggregatorId: t.String()
      }),
      body: t.Union([
        // Direct format (PSPWare v2 sends data directly)
        t.Object({
          id: t.String(),
          sum: t.Number(),
          currency: t.Optional(t.String()),
          fee: t.Optional(t.Number()),
          status: t.String(),
          card: t.Optional(t.String()),
          bank: t.Optional(t.String()),
          pay_type: t.Optional(t.String()),
          bank_name: t.Optional(t.String()),
          fee_currency: t.Optional(t.String()),
          currency_rate: t.Optional(t.Number()),
          order_type: t.Optional(t.String()),
          merchant_id: t.Optional(t.String()),
          created_at: t.Optional(t.String()),
          updated_at: t.Optional(t.String()),
          recipient: t.Optional(t.String()),
          bik: t.Optional(t.Union([t.String(), t.Null()])),
          payment_url: t.Optional(t.String()),
          geo: t.Optional(t.String()),
          signature: t.Optional(t.String()),
          merchant: t.Optional(t.Object({
            id: t.String()
          }))
        }, { additionalProperties: true }),
        // Nested format (legacy support)
        t.Object({
          data: t.Object({
            id: t.String(),
            sum: t.Number(),
            currency: t.Optional(t.String()),
            fee: t.Optional(t.Number()),
            status: t.String(),
            card: t.Optional(t.String()),
            bank: t.Optional(t.String()),
            pay_type: t.Optional(t.String()),
            bank_name: t.Optional(t.String()),
            fee_currency: t.Optional(t.String()),
            currency_rate: t.Optional(t.Number()),
            order_type: t.Optional(t.String()),
            merchant_id: t.Optional(t.String()),
            created_at: t.Optional(t.String()),
            updated_at: t.Optional(t.String()),
            recipient: t.Optional(t.String()),
            bik: t.Optional(t.Union([t.String(), t.Null()])),
            payment_url: t.Optional(t.String()),
            geo: t.Optional(t.String()),
            signature: t.Optional(t.String()),
            merchant: t.Optional(t.Object({
              id: t.String()
            }))
          }, { additionalProperties: true })
        }, { additionalProperties: true })
      ]),
      detail: {
        tags: ['pspware'],
        summary: 'PSPWare callback endpoint'
      }
    }
  )
  .get(
    '/success',
    async ({ query }) => {
      console.log('[PSPWare] Success redirect:', query);
      // В реальном приложении здесь должен быть редирект на страницу успеха
      return {
        status: 'success',
        message: 'Payment successful',
        orderId: query.order_id
      };
    },
    {
      query: t.Object({
        order_id: t.Optional(t.String())
      }),
      detail: {
        tags: ['pspware'],
        summary: 'PSPWare success redirect'
      }
    }
  )
  .get(
    '/failure',
    async ({ query }) => {
      console.log('[PSPWare] Failure redirect:', query);
      // В реальном приложении здесь должен быть редирект на страницу ошибки
      return {
        status: 'failure',
        message: 'Payment failed',
        orderId: query.order_id
      };
    },
    {
      query: t.Object({
        order_id: t.Optional(t.String())
      }),
      detail: {
        tags: ['pspware'],
        summary: 'PSPWare failure redirect'
      }
    }
  );