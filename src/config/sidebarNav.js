import { HiArrowTrendingUp, HiCog6Tooth, HiOutlineSquares2X2 } from "react-icons/hi2";
import { LuLogOut, LuUserRound } from "react-icons/lu";
import { RiCalendarTodoLine, RiHandCoinLine } from "react-icons/ri";

export const SIDEBAR_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", Icon: HiOutlineSquares2X2 },
  { key: "income", label: "Income", path: "/income", Icon: HiArrowTrendingUp },
  { key: "expense", label: "Expense", path: "/expense", Icon: RiHandCoinLine },
  { key: "profile", label: "Profile", path: "/profile", Icon: LuUserRound },
  { key: "todo", label: "Todo", path: "/todo", Icon: RiCalendarTodoLine },
  { key: "settings", label: "Settings", path: "/settings", Icon: HiCog6Tooth },
  { key: "logout", label: "Logout", action: "logout", Icon: LuLogOut }
];
