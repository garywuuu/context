/**
 * Block Kit layouts for decision confirmation DMs and the edit modal.
 */
import {
  type SlackBlock,
  type SlackView,
  type SlackOption,
  header,
  section,
  sectionFields,
  divider,
  actions,
  button,
  context,
  inputBlock,
  textInput,
  staticSelect,
  option,
  plainText,
} from './block-kit';

// ---------- Area / Type options (mirrors extraction categories) ----------

const AREA_OPTIONS: SlackOption[] = [
  option('Product', 'product'),
  option('Engineering', 'engineering'),
  option('Design', 'design'),
  option('Operations', 'operations'),
  option('Sales', 'sales'),
  option('Marketing', 'marketing'),
  option('Finance', 'finance'),
  option('HR / People', 'hr'),
  option('Other', 'other'),
];

const TYPE_OPTIONS: SlackOption[] = [
  option('Strategic', 'strategic'),
  option('Technical', 'technical'),
  option('Process', 'process'),
  option('Hiring', 'hiring'),
  option('Budget', 'budget'),
  option('Policy', 'policy'),
  option('Other', 'other'),
];

// ---------- Confirmation DM ----------

export interface DecisionConfirmationParams {
  traceId: string;
  title: string;
  rationale: string;
  area?: string;
  confidence: number;
  sourceUrl?: string;
  channelName?: string;
}

export function buildDecisionConfirmationBlocks(
  params: DecisionConfirmationParams
): SlackBlock[] {
  const { traceId, title, rationale, area, confidence, sourceUrl, channelName } = params;

  const confidencePct = Math.round(confidence * 100);
  const metaFields: string[] = [];
  if (area) metaFields.push(`*Area:* ${area}`);
  metaFields.push(`*Confidence:* ${confidencePct}%`);
  if (channelName) metaFields.push(`*Source:* #${channelName}`);
  if (sourceUrl) metaFields.push(`<${sourceUrl}|View in Slack>`);

  const blocks: SlackBlock[] = [
    header('Decision Detected'),
    section(`*${title}*`),
  ];

  if (rationale) {
    blocks.push(section(`_${rationale}_`));
  }

  if (metaFields.length > 0) {
    blocks.push(sectionFields(metaFields));
  }

  blocks.push(divider());
  blocks.push(
    actions(
      [
        button('Confirm', 'decision_confirm', traceId, 'primary'),
        button('Edit', 'decision_edit', traceId),
        button('Ignore', 'decision_ignore', traceId, 'danger'),
      ],
      `decision_actions_${traceId}`
    )
  );

  return blocks;
}

// ---------- Post-action replacement messages ----------

export function buildDecisionConfirmedBlocks(
  title: string,
  action: 'confirmed' | 'edited' | 'dismissed',
  actor?: string
): SlackBlock[] {
  const emoji =
    action === 'confirmed' ? '\u2705' : action === 'edited' ? '\u270F\uFE0F' : '\u274C';
  const label =
    action === 'confirmed'
      ? 'Confirmed'
      : action === 'edited'
        ? 'Edited & Confirmed'
        : 'Dismissed';

  const who = actor ? ` by ${actor}` : '';

  return [
    section(`${emoji}  *${title}*`),
    context([`${label}${who}`]),
  ];
}

// ---------- Edit modal ----------

export function buildDecisionEditModal(params: {
  traceId: string;
  title: string;
  rationale: string;
  area?: string;
  type?: string;
}): SlackView {
  const { traceId, title, rationale, area, type } = params;

  const initialArea = AREA_OPTIONS.find((o) => o.value === area);
  const initialType = TYPE_OPTIONS.find((o) => o.value === type);

  return {
    type: 'modal',
    callback_id: 'decision_edit_modal',
    private_metadata: traceId,
    title: plainText('Edit Decision'),
    submit: plainText('Save'),
    close: plainText('Cancel'),
    blocks: [
      inputBlock('Title', 'title_block', textInput('title_input', 'Decision title', title)),
      inputBlock(
        'Rationale',
        'rationale_block',
        textInput('rationale_input', 'Why was this decided?', rationale, true),
        true
      ),
      inputBlock(
        'Area',
        'area_block',
        staticSelect('area_input', AREA_OPTIONS, initialArea, 'Select area'),
        true
      ),
      inputBlock(
        'Type',
        'type_block',
        staticSelect('type_input', TYPE_OPTIONS, initialType, 'Select type'),
        true
      ),
    ],
  };
}
