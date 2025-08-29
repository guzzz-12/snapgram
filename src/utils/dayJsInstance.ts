import dayjs from "dayjs";
import es from "dayjs/locale/es";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.locale(es);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(relativeTime);

export default dayjs;