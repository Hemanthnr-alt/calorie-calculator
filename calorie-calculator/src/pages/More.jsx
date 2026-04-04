import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiChevronRight,
  FiCoffee,
  FiPieChart,
  FiSettings,
  FiShoppingCart,
  FiTarget,
} from 'react-icons/fi';
import { GiWaterDrop } from 'react-icons/gi';
import { LuScanLine } from 'react-icons/lu';

const GROUPS = [
  {
    heading: 'Logging',
    items: [
      { title: 'Food diary', path: '/food-log', icon: <FiPieChart /> },
      { title: 'Add food & search', path: '/meal-prep', icon: <FiCoffee /> },
      { title: 'Barcode scan', path: '/barcode', icon: <LuScanLine /> },
    ],
  },
  {
    heading: 'Health & habits',
    items: [
      { title: 'Water intake', path: '/water', icon: <GiWaterDrop /> },
      { title: 'Workouts', path: '/workouts', icon: <FiActivity /> },
      { title: 'BMR & calorie targets', path: '/bmr', icon: <FiTarget /> },
    ],
  },
  {
    heading: 'Planning & insights',
    items: [
      { title: 'Meal ideas', path: '/recommendations', icon: <FiCoffee /> },
      { title: 'Shopping list', path: '/shopping', icon: <FiShoppingCart /> },
      { title: 'Analytics', path: '/analytics', icon: <FiPieChart /> },
      { title: 'Settings', path: '/settings', icon: <FiSettings /> },
    ],
  },
];

export default function More() {
  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>Tools</h1>
        <p>Logging, planning, and insights — organized for quick access.</p>
      </div>

      <div className="more-sections-wrap">
        {GROUPS.map((group) => (
          <div key={group.heading} className="card more-section-card">
            <h2 className="more-section-heading">{group.heading}</h2>
            {group.items.map((item) => (
              <Link key={item.path} to={item.path} className="more-link-row">
                <span className="more-row-left">
                  <span className="more-row-icon">{item.icon}</span>
                  <span className="more-row-label">{item.title}</span>
                </span>
                <span className="more-row-chevron" aria-hidden>
                  <FiChevronRight />
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
