'use strict';

/**
 * Local Audit & Replay Trail (ODVPA - SIH 2026 PS 26171)
 *
 * Maintains an on-device inspectable record of every perception, privacy detection,
 * routing decision, and outbound request. Never leaves the user's device.
 */

class LocalAuditTrail {
  constructor() {
    this.entries = [];
  }

  /**
   * Records an audit log entry for a perception/reasoning turn
   */
  logTurn(event = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      turnIndex: event.turnIndex || this.entries.length + 1,
      role: event.role || 'reasoning', // 'reasoning' | 'vision' | 'perception'
      url: event.url || '',
      nodesObserved: event.nodesCount || 0,
      changedNodesCount: event.changedNodesCount || 0,
      piiDetectedCount: event.piiDetectedCount || 0,
      piiTypes: event.piiTypes || [],
      privacyRiskScore: event.privacyRiskScore || 0.0,
      privacyGateStatus: event.privacyGateStatus || 'SAFE',
      routeDecision: event.routeDecision || 'LOCAL',
      modelTierUsed: event.modelTierUsed || 'Local SLM (Qwen2.5:1.5b-instruct)',
      escalationReason: event.escalationReason || null,
      offDevicePayloadSent: Boolean(event.offDevicePayloadSent),
      bytesSentOffDevice: event.bytesSentOffDevice || 0,
      compressionRatio: event.compressionRatio || 0.0,
      action: event.action || null,
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Returns complete audit summary with role breakdown
   */
  getSummary() {
    const totalTurns = this.entries.length;
    const offDeviceTurns = this.entries.filter(e => e.offDevicePayloadSent).length;
    const piiRedactedTurns = this.entries.filter(e => e.piiDetectedCount > 0).length;
    const reasoningTurns = this.entries.filter(e => e.role === 'reasoning');
    const visionTurns = this.entries.filter(e => e.role === 'vision');

    return {
      totalTurns,
      localOnlyTurns: totalTurns - offDeviceTurns,
      offDeviceTurns,
      privacyPreservationRate: totalTurns > 0 ? (totalTurns - offDeviceTurns) / totalTurns : 1.0,
      piiRedactedTurns,
      reasoning: {
        total: reasoningTurns.length,
        local: reasoningTurns.filter(e => !e.offDevicePayloadSent).length,
        escalated: reasoningTurns.filter(e => e.offDevicePayloadSent).length,
      },
      vision: {
        total: visionTurns.length,
        local: visionTurns.filter(e => !e.offDevicePayloadSent).length,
        escalated: visionTurns.filter(e => e.offDevicePayloadSent).length,
      },
      entries: this.entries,
    };
  }

  /**
   * Renders HTML audit log table for report.html
   */
  renderHtmlReport() {
    const summary = this.getSummary();
    const rowsHtml = this.entries
      .map(
        e => `
      <tr>
        <td>${e.turnIndex}</td>
        <td><code>${e.url.substring(0, 30)}...</code></td>
        <td>${e.nodesObserved}</td>
        <td><span class="badge ${e.piiDetectedCount > 0 ? 'badge-warning' : 'badge-success'}">${e.piiDetectedCount} (${e.piiTypes.join(', ') || 'none'})</span></td>
        <td>${e.privacyRiskScore.toFixed(2)}</td>
        <td><strong>${e.routeDecision}</strong> (${e.modelTierUsed})</td>
        <td>${e.offDevicePayloadSent ? '<span style="color:red">OFF-DEVICE (RED)(Redacted)</span>' : '<span style="color:green">ON-DEVICE ONLY</span>'}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="audit-trail-container">
        <h3>Local Audit & Replay Trail (ODVPA Privacy Metrics)</h3>
        <p><strong>Total Session Turns:</strong> ${summary.totalTurns} | <strong>On-Device Only:</strong> ${summary.localOnlyTurns} (${(summary.privacyPreservationRate * 100).toFixed(1)}%) | <strong>Off-Device Escalated:</strong> ${summary.offDeviceTurns}</p>
        <table border="1" cellpadding="5" cellspacing="0" class="audit-table">
          <thead>
            <tr>
              <th>Turn</th>
              <th>URL</th>
              <th>Nodes</th>
              <th>PII Detections</th>
              <th>Risk Score</th>
              <th>Routing & Model Tier</th>
              <th>Privacy Boundary Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7">No turns recorded yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }
}

module.exports = {
  LocalAuditTrail,
};
