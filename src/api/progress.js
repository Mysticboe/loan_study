import { fetchLoanApplicationList } from './loan';

export const fetchProgressPage = ({ pageNo, pageSize }) => fetchLoanApplicationList({ pageNo, pageSize });
