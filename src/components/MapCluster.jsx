// Helper: cluster tasks by proximity
export function clusterTasks(tasks, zoom) {
  // Clustering radius in degrees based on zoom level
  const radius = zoom >= 14 ? 0.003 : zoom >= 12 ? 0.01 : zoom >= 10 ? 0.04 : 0.12;

  const clusters = [];
  const used = new Set();

  tasks.forEach((task, i) => {
    if (used.has(i)) return;
    const cluster = { tasks: [task], lat: task.lat, lng: task.lng };
    tasks.forEach((other, j) => {
      if (i === j || used.has(j)) return;
      const dlat = Math.abs(task.lat - other.lat);
      const dlng = Math.abs(task.lng - other.lng);
      if (dlat < radius && dlng < radius) {
        cluster.tasks.push(other);
        cluster.lat = (cluster.lat + other.lat) / 2;
        cluster.lng = (cluster.lng + other.lng) / 2;
        used.add(j);
      }
    });
    used.add(i);
    clusters.push(cluster);
  });

  return clusters;
}