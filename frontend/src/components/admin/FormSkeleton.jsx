import Skeleton from '../feedback/Skeleton';

function FormSkeleton({ styles }) {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <div style={styles.section}>
        <Skeleton width="120px" height="12px" borderRadius="4px" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
          <Skeleton height="36px" borderRadius="8px" />
          <div style={{ display: 'flex', gap: '6px' }}>
            <Skeleton width="120px" height="36px" borderRadius="8px" />
            <Skeleton width="100px" height="36px" borderRadius="8px" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Skeleton height="36px" borderRadius="8px" />
          <Skeleton height="36px" borderRadius="8px" />
        </div>
        <Skeleton height="56px" borderRadius="8px" />
      </div>

      <div style={styles.section}>
        <Skeleton width="120px" height="12px" borderRadius="4px" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Skeleton height="36px" borderRadius="8px" />
          <Skeleton height="36px" borderRadius="8px" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Skeleton height="36px" borderRadius="8px" />
          <Skeleton height="36px" borderRadius="8px" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Skeleton height="36px" borderRadius="8px" />
          <Skeleton height="36px" borderRadius="8px" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', alignItems: 'start' }}>
        <div />
        <div style={styles.section}>
          <Skeleton width="120px" height="12px" borderRadius="4px" />
          <Skeleton height="36px" borderRadius="8px" />
          <Skeleton height="100px" borderRadius="8px" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Skeleton height="160px" borderRadius="8px" />
            <Skeleton height="100px" borderRadius="8px" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormSkeleton;
