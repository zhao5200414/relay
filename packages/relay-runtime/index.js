/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

'use strict';

const RelayConcreteNode = require('./util/RelayConcreteNode');
const RelayConcreteVariables = require('./store/RelayConcreteVariables');
const RelayConnectionHandler = require('./handlers/connection/RelayConnectionHandler');
const RelayConnectionInterface = require('./handlers/connection/RelayConnectionInterface');
const RelayCore = require('./store/RelayCore');
const RelayDeclarativeMutationConfig = require('./mutations/RelayDeclarativeMutationConfig');
const RelayDefaultHandleKey = require('./util/RelayDefaultHandleKey');
const RelayDefaultHandlerProvider = require('./handlers/RelayDefaultHandlerProvider');
const RelayError = require('./util/RelayError');
const RelayFeatureFlags = require('./util/RelayFeatureFlags');
const RelayInMemoryRecordSource = require('./store/RelayInMemoryRecordSource');
const RelayModernEnvironment = require('./store/RelayModernEnvironment');
const RelayModernFragmentOwner = require('./store/RelayModernFragmentOwner');
const RelayModernGraphQLTag = require('./query/RelayModernGraphQLTag');
const RelayModernStore = require('./store/RelayModernStore');
const RelayNetwork = require('./network/RelayNetwork');
const RelayNetworkLoggerTransaction = require('./network/RelayNetworkLoggerTransaction');
const RelayObservable = require('./network/RelayObservable');
const RelayProfiler = require('./util/RelayProfiler');
const RelayQueryResponseCache = require('./network/RelayQueryResponseCache');
const RelayStoreUtils = require('./store/RelayStoreUtils');
const RelayViewerHandler = require('./handlers/viewer/RelayViewerHandler');

const applyRelayModernOptimisticMutation = require('./mutations/applyRelayModernOptimisticMutation');
const commitLocalUpdate = require('./mutations/commitLocalUpdate');
const commitRelayModernMutation = require('./mutations/commitRelayModernMutation');
const createRelayNetworkLogger = require('./network/createRelayNetworkLogger');
const deepFreeze = require('./util/deepFreeze');
const fetchQueryInternal = require('./query/fetchQueryInternal');
const fetchRelayModernQuery = require('./query/fetchRelayModernQuery');
const generateRelayClientID = require('./store/generateRelayClientID');
const getFragmentIdentifier = require('./util/getFragmentIdentifier');
const getFragmentSpecIdentifier = require('./util/getFragmentSpecIdentifier');
const getOperationIdentifier = require('./util/getOperationIdentifier');
const getRelayHandleKey = require('./util/getRelayHandleKey');
const isRelayModernEnvironment = require('./store/isRelayModernEnvironment');
const isScalarAndEqual = require('./util/isScalarAndEqual');
const recycleNodesInto = require('./util/recycleNodesInto');
const requestRelaySubscription = require('./subscription/requestRelaySubscription');
const stableCopy = require('./util/stableCopy');

export type {
  ConnectionMetadata,
} from './handlers/connection/RelayConnectionHandler';
export type {
  EdgeRecord,
  PageInfo,
} from './handlers/connection/RelayConnectionInterface';
export type {
  DeclarativeMutationConfig,
  MutationType,
  RangeOperation,
  RangeBehaviors,
} from './mutations/RelayDeclarativeMutationConfig';
export type {
  OptimisticMutationConfig,
} from './mutations/applyRelayModernOptimisticMutation';
export type {MutationConfig} from './mutations/commitRelayModernMutation';
export type {RelayNetworkLog} from './network/RelayNetworkLoggerTransaction';
export type {
  ExecuteFunction,
  FetchFunction,
  GraphQLResponse,
  LegacyObserver,
  Network as INetwork,
  PayloadData,
  PayloadError,
  SubscribeFunction,
  Uploadable,
  UploadableMap,
} from './network/RelayNetworkTypes';
export type {
  ObservableFromValue,
  Observer,
  Subscribable,
  Subscription,
} from './network/RelayObservable';
export type {GraphiQLPrinter} from './network/createRelayNetworkLogger';
export type {GraphQLTaggedNode} from './query/RelayModernGraphQLTag';
export type {RecordState} from './store/RelayRecordState';
export type {
  Environment as IEnvironment,
  FragmentPointer,
  FragmentMap,
  FragmentReference,
  FragmentSpecResolver,
  HandleFieldPayload,
  ModuleImportPointer,
  MissingFieldHandler,
  OperationLoader,
  OperationDescriptor,
  OptimisticUpdate,
  OwnedReaderSelector,
  RecordProxy,
  RecordSourceProxy,
  RecordSourceSelectorProxy,
  RelayContext,
  ReaderSelector,
  NormalizationSelector,
  SelectorData,
  SelectorStoreUpdater,
  Snapshot,
  StoreUpdater,
} from './store/RelayStoreTypes';
export type {
  GraphQLSubscriptionConfig,
} from './subscription/requestRelaySubscription';
export type {
  NormalizationArgument,
  NormalizationArgumentDefinition,
  NormalizationDefer,
  NormalizationField,
  NormalizationLinkedField,
  NormalizationModuleImport,
  NormalizationScalarField,
  NormalizationSelection,
  NormalizationSplitOperation,
  NormalizationStream,
} from './util/NormalizationNode';
export type {NormalizationOperation} from './util/NormalizationNode';
export type {
  ReaderArgument,
  ReaderArgumentDefinition,
  ReaderField,
  ReaderFragment,
  ReaderLinkedField,
  ReaderModuleImport,
  ReaderPaginationMetadata,
  ReaderRefetchMetadata,
  ReaderRefetchableFragment,
  ReaderScalarField,
  ReaderSelection,
  ReaderSplitOperation,
} from './util/ReaderNode';
export type {
  CEnvironment,
  CFragmentMap,
  CNormalizationSelector,
  COperationDescriptor,
  CReaderSelector,
  CRelayContext,
  CSnapshot,
  CUnstableEnvironmentCore,
  CFragmentSpecResolver,
  FragmentSpecResults,
  Props,
} from './util/RelayCombinedEnvironmentTypes';
export type {
  ConcreteRequest,
  GeneratedNode,
  RequestParameters,
} from './util/RelayConcreteNode';
export type {
  CacheConfig,
  DataID,
  Disposable,
  OperationType,
  Variables,
} from './util/RelayRuntimeTypes';

// As early as possible, check for the existence of the JavaScript globals which
// Relay Runtime relies upon, and produce a clear message if they do not exist.
if (__DEV__) {
  if (
    typeof Map !== 'function' ||
    typeof Set !== 'function' ||
    typeof Promise !== 'function' ||
    typeof Object.assign !== 'function'
  ) {
    throw new Error(
      'relay-runtime requires Map, Set, Promise, and Object.assign to exist. ' +
        'Use a polyfill to provide these for older browsers.',
    );
  }
}

/**
 * The public interface to Relay Runtime.
 */
module.exports = {
  // Core API
  Environment: RelayModernEnvironment,
  Network: RelayNetwork,
  Observable: RelayObservable,
  QueryResponseCache: RelayQueryResponseCache,
  RecordSource: RelayInMemoryRecordSource,
  Store: RelayModernStore,

  areEqualSelectors: RelayCore.areEqualSelectors,
  createFragmentSpecResolver: RelayCore.createFragmentSpecResolver,
  createOperationDescriptor: RelayCore.createOperationDescriptor,
  getDataIDsFromFragment: RelayCore.getDataIDsFromFragment,
  getDataIDsFromObject: RelayCore.getDataIDsFromObject,
  getFragment: RelayModernGraphQLTag.getFragment,
  getFragmentOwner: RelayModernFragmentOwner.getFragmentOwner,
  getFragmentOwners: RelayModernFragmentOwner.getFragmentOwners,
  getPaginationFragment: RelayModernGraphQLTag.getPaginationFragment,
  getRefetchableFragment: RelayModernGraphQLTag.getRefetchableFragment,
  getRequest: RelayModernGraphQLTag.getRequest,
  getSingularSelector: RelayCore.getSingularSelector,
  getPluralSelector: RelayCore.getPluralSelector,
  getSelector: RelayCore.getSelector,
  getSelectorsFromObject: RelayCore.getSelectorsFromObject,
  getStorageKey: RelayStoreUtils.getStorageKey,
  getVariablesFromSingularFragment: RelayCore.getVariablesFromSingularFragment,
  getVariablesFromPluralFragment: RelayCore.getVariablesFromPluralFragment,
  getVariablesFromFragment: RelayCore.getVariablesFromFragment,
  getVariablesFromObject: RelayCore.getVariablesFromObject,
  graphql: RelayModernGraphQLTag.graphql,

  // Declarative mutation API
  MutationTypes: RelayDeclarativeMutationConfig.MutationTypes,
  RangeOperations: RelayDeclarativeMutationConfig.RangeOperations,

  // Extensions
  DefaultHandlerProvider: RelayDefaultHandlerProvider,
  ConnectionHandler: RelayConnectionHandler,
  ViewerHandler: RelayViewerHandler,

  // Helpers (can be implemented via the above API)
  applyOptimisticMutation: applyRelayModernOptimisticMutation,
  commitLocalUpdate: commitLocalUpdate,
  commitMutation: commitRelayModernMutation,
  fetchQuery: fetchRelayModernQuery,
  isRelayModernEnvironment: isRelayModernEnvironment,
  requestSubscription: requestRelaySubscription,

  // Configuration interface for legacy or special uses
  ConnectionInterface: RelayConnectionInterface,

  // Utilities
  RelayProfiler: RelayProfiler,

  // INTERNAL-ONLY: These exports might be removed at any point.
  RelayConcreteNode: RelayConcreteNode,
  RelayError: RelayError,
  RelayFeatureFlags: RelayFeatureFlags,
  RelayNetworkLoggerTransaction: RelayNetworkLoggerTransaction,
  DEFAULT_HANDLE_KEY: RelayDefaultHandleKey.DEFAULT_HANDLE_KEY,
  FRAGMENTS_KEY: RelayStoreUtils.FRAGMENTS_KEY,
  FRAGMENT_OWNER_KEY: RelayStoreUtils.FRAGMENT_OWNER_KEY,
  ID_KEY: RelayStoreUtils.ID_KEY,
  REF_KEY: RelayStoreUtils.REF_KEY,
  REFS_KEY: RelayStoreUtils.REFS_KEY,
  ROOT_ID: RelayStoreUtils.ROOT_ID,
  ROOT_TYPE: RelayStoreUtils.ROOT_TYPE,
  TYPENAME_KEY: RelayStoreUtils.TYPENAME_KEY,

  createRelayNetworkLogger: createRelayNetworkLogger,
  deepFreeze: deepFreeze,
  generateClientID: generateRelayClientID,
  getRelayHandleKey: getRelayHandleKey,
  isScalarAndEqual: isScalarAndEqual,
  recycleNodesInto: recycleNodesInto,
  stableCopy: stableCopy,
  getOperationIdentifier: getOperationIdentifier,
  getFragmentIdentifier: getFragmentIdentifier,
  getFragmentSpecIdentifier: getFragmentSpecIdentifier,
  __internal: {
    getModernOperationVariables: RelayConcreteVariables.getOperationVariables,
    fetchQuery: fetchQueryInternal.fetchQuery,
    getPromiseForRequestInFlight:
      fetchQueryInternal.getPromiseForRequestInFlight,
  },
};
