import { HistoryStringParts, SEPARATOR } from '../data-types/constants';
import { HistoryObject, TxMAIngressEvent } from '../data-types/interfaces';
import { AccountStateEngine } from '../services/account-states/account-state-engine';

export class HistoryStringBuilder {
  /**
   * Method to build the history string from parts
   * @param event_timestamp_ms - sentAt part of the history string
   * @param component_id - component part of the history string
   * @param intervention_code - intervention code that is used to set the intervention
   * @param intervention_reason - code that is used to set the reason
   * @param originating_component_id - set as empty as it is optional
   * @param intervention_predecessor_id - set as empty as it is optional
   * @param requester_id - set as empty as it is optional
   * @returns - each field seperated by a '|' character.
   */
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

  /**
   * Method to assess information and update the history string accordingly
   * @param event - Takes the event from the ingress queue
   * @param timeStamp - takes the events timestamp
   * @returns - the history string that has been built with the buildHistoryString method with the
   * information of each part, updated.
   */
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

  /**
   * Method to get the history object and validates if it contains the correct amount of components.
   * @param historyString - string passed in with seperators ('|') included. This will be
   * recieved from DynamoDB.
   * @returns - The history string transformed into an object.
   */
  public getHistoryObject(historyString: string): HistoryObject {
    const array = historyString.split(SEPARATOR);
    const historyStringPartsValidate = Object.keys(HistoryStringParts).length / 2;
    if (historyStringPartsValidate !== array.length)
      throw new Error('History string does not contain the right amount of components.');
    return this.buildHistoryObject(array);
  }

  /**
   * Method to take the history string and transform it into an object.
   * @param array - Array of strings recieved from DynamoDB.
   * @returns - The string transformed into an object with the relevant parts.
   * Optional parts are left as an empty string ('')
   */
  private buildHistoryObject(array: string[]): HistoryObject {
    const timestamp = array[HistoryStringParts.EVENT_TIMESTAMP_MS];
    const code = array[HistoryStringParts.INTERVENTION_CODE];
    const component = array[HistoryStringParts.COMPONENT_ID];
    const reason = array[HistoryStringParts.INTERVENTION_REASON];
    if (!timestamp || !code || !component || !reason)
      throw new Error('One of the required property was not found in the history string.');
    const sentAt = new Date(Number.parseInt(timestamp)).toISOString();
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
