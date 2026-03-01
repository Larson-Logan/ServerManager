import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ActivityHeatmap } from '../../components/admin/ActivityHeatmap';
import { ServiceHealth } from '../../components/admin/ServiceHealth';
import { SystemMetrics } from '../../components/SystemMetrics';

export const AdminMetrics = () => {
  const { heatmapData, serviceStatus, fetchExtendedData, accessToken } = useOutletContext();

  return (
    <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ActivityHeatmap data={heatmapData} />
        <ServiceHealth services={serviceStatus} onRefresh={fetchExtendedData} />
      </div>
      <SystemMetrics token={accessToken} />
    </div>
  );
};
