import { Link } from 'react-router-dom';
import ContentCard from '../../../components/media/ContentCard';

export default function ContentRail({ title, items, type, viewAllLink, priorityCount = 0 }) {
  if (!items?.length) return null;
  return (
    <section className="catalog-section">
      <div className="catalog-section-heading"><h2>{title}</h2>{viewAllLink && <Link to={viewAllLink}>View all</Link>}</div>
      <div className="catalog-grid">{items.map((item, index) => <ContentCard key={item.id} item={item} type={type} eager={index < priorityCount} />)}</div>
    </section>
  );
}
