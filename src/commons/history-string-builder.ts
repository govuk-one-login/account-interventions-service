import { HistoryStringParts, SEPARATOR } from '../data-types/constants';
import { HistoryObject, TxMAIngressEvent } from '../data-types/interfaces';
import { AccountStateEngine } from '../services/account-states/account-state-engine';

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
      interventionInformation?.originator_reference_id,
      interventionInformation?.requester_id,
    );
  }

  public getHistoryObject(historyString: string): HistoryObject {
    const array = historyString.split(SEPARATOR);
    if (array.length !== Object.keys(HistoryStringParts).length / 2)
      throw new Error('History string does not contain the right amount of components.');
    return this.buildHistoryObject(array);
  }

  private buildHistoryObject(array: string[]): HistoryObject {
    const timestamp = array[HistoryStringParts.EVENT_TIMESTAMP_MS];
    const code = array[HistoryStringParts.INTERVENTION_CODE];
    const component = array[HistoryStringParts.COMPONENT_ID];
    const reason = array[HistoryStringParts.INTERVENTION_REASON];
    if (!timestamp || !code || !component || !reason)
      throw new Error('One of the required property was not found in the history string.');
    const sentAt = convertStringToIsoString(Number.parseInt(timestamp));
    const intervention = AccountStateEngine.getInstance().getInterventionEnumFromCode(Number.parseInt(code));
    const originatingComponent = array[HistoryStringParts.ORIGINATING_COMPONENT_ID];
    const originatorReference = array[HistoryStringParts.ORIGINATOR_REFERENCE_ID];
    const requesterId = array[HistoryStringParts.REQUESTER_ID];
    return {
      sentAt,
      component,
      code,
      intervention,
      reason,
      originatingComponent: originatingComponent === '' ? undefined : originatingComponent,
      originatorReferenceId: originatorReference === '' ? undefined : originatorReference,
      requesterId: requesterId === '' ? undefined : requesterId,
    };
  }
}

function convertStringToIsoString(input: number) {
  return new Date(input).toISOString();
}
