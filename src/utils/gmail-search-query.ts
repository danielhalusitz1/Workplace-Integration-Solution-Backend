import moment from 'moment';

export function buildGmailDateQuery(
  from: Date | string,
  to: Date | string,
): string {
  const afterDate = moment(from)
    .startOf('day')
    .subtract(1, 'day')
    .format('YYYY/MM/DD');
  const beforeDate = moment(to)
    .startOf('day')
    .add(1, 'day')
    .format('YYYY/MM/DD');

  return `after:${afterDate} before:${beforeDate}`;
}
