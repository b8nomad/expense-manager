import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

import authRoutes from './routes/auth';
import expenseRoutes from './routes/expense';
import approvalFlowRoutes from './routes/approval-flow';
import approvalsRoutes from './routes/approvals';

const app = express();

app.use(helmet()); // Security middleware
app.use(cors());
app.use(morgan('combined')); // HTTP request logger
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/approval-flows', approvalFlowRoutes);
app.use('/api/approvals', approvalsRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});