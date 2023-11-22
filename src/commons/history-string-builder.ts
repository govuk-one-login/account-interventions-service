import { SEPARATOR } from '../data-types/constants';
import { TxMAIngressEvent } from '../data-types/interfaces';

export class HistoryStringBuilder {
  private buildHistoryString(
    event_timestamp_ms: string,
    component_id: string,
    intervention_code: string,
    intervention_reason: string,
    originating_component_id = '',
    intervention_predecessor_id = '',
    requester_id = '',
  ) {
    return `${event_timestamp_ms}${SEPARATOR}${component_id}${SEPARATOR}${intervention_code}${SEPARATOR}${intervention_reason}${SEPARATOR}${originating_component_id}${SEPARATOR}${intervention_predecessor_id}${SEPARATOR}${requester_id}`;
  }

  public getHistoryString(event: TxMAIngressEvent, timeStamp: number) {
    const interventionInformation = event.extensions?.intervention;
    if (!interventionInformation) throw new Error('No intervention information found in event.');
    return this.buildHistoryString(
      `${timeStamp}`,
      event.component_id,
      interventionInformation?.intervention_code,
      interventionInformation?.intervention_reason,
      interventionInformation?.originating_component_id,
      interventionInformation?.intervention_predecessor_id,
      interventionInformation?.requester_id,
    );
  }

  // public getHistoryObject(historyString: string){
  //
  // }
}
