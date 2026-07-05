import { Router } from 'express';
import { sendMessage, getHistory, clearHistory } from './chatbot.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { tenantScope } from '../../middlewares/tenant.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { sendMessageSchema, historyQuerySchema } from './chatbot.schema';

export const chatbotRouter = Router();

chatbotRouter.use(authenticate, tenantScope, authorize('ADMIN', 'KETUA_RT', 'BENDAHARA', 'SEKRETARIS'));

chatbotRouter.post('/send', validate(sendMessageSchema), sendMessage);
chatbotRouter.get('/history', validate(historyQuerySchema), getHistory);
chatbotRouter.delete('/history', clearHistory);
