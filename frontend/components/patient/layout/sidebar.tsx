import Header from "./header";
import NavLinks from "./nav-links";

const Sidebar = () => {
  return (
    <aside className="p-2 pt-4 pr-0 min-w-80">
      <Header />
      <NavLinks />
    </aside>
  );
};

export default Sidebar;
