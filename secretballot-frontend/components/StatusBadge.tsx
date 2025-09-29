interface StatusBadgeProps {
  status: number;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return { text: '未开始', className: 'status-pending' };
      case 1:
        return { text: '进行中', className: 'status-active' };
      case 2:
        return { text: '已结束', className: 'status-ended' };
      case 3:
        return { text: '已公布', className: 'status-published' };
      default:
        return { text: '未知', className: 'status-ended' };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <span className={`${statusInfo.className} ${className}`}>
      {statusInfo.text}
    </span>
  );
}


