import { Navigate } from 'react-router-dom';

/** 404 兜底重定向 */
export const BrNavigateHome: React.FC = () => <Navigate to="/" replace />;

export default BrNavigateHome;
