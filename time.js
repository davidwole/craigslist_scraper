function timeAgo(dateString) {
  const postedTime = new Date(dateString);
  const now = new Date();
  const secondsPast = Math.floor((now - postedTime) / 1000);

  const intervals = [
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(secondsPast / interval.seconds);
    if (count >= 1) {
      return count === 1 ? `1 ${interval.label} ago` : `${count} ${interval.label}s ago`;
    }
  }

  return 'just now';
}


module.exports = {
  timeAgo
}