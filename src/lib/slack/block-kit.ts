/**
 * Shared Block Kit types and builder functions for Slack surfaces.
 */

// ---------- Types ----------

export interface SlackText {
  type: 'mrkdwn' | 'plain_text';
  text: string;
  emoji?: boolean;
}

export interface SlackOption {
  text: SlackText;
  value: string;
}

export interface SlackElement {
  type: string;
  action_id?: string;
  text?: SlackText;
  value?: string;
  style?: 'primary' | 'danger';
  placeholder?: SlackText;
  options?: SlackOption[];
  initial_option?: SlackOption;
  initial_value?: string;
  multiline?: boolean;
  optional?: boolean;
}

export interface SlackBlock {
  type: string;
  text?: SlackText;
  block_id?: string;
  elements?: SlackElement[];
  element?: SlackElement;
  label?: SlackText;
  optional?: boolean;
  fields?: SlackText[];
  accessory?: SlackElement;
}

export interface SlackView {
  type: 'modal' | 'home';
  callback_id?: string;
  private_metadata?: string;
  title: SlackText;
  submit?: SlackText;
  close?: SlackText;
  blocks: SlackBlock[];
}

// ---------- Text builders ----------

export function mrkdwn(text: string): SlackText {
  return { type: 'mrkdwn', text };
}

export function plainText(text: string, emoji = true): SlackText {
  return { type: 'plain_text', text, emoji };
}

// ---------- Block builders ----------

export function section(text: string, blockId?: string): SlackBlock {
  const block: SlackBlock = { type: 'section', text: mrkdwn(text) };
  if (blockId) block.block_id = blockId;
  return block;
}

export function sectionFields(fields: string[], blockId?: string): SlackBlock {
  const block: SlackBlock = {
    type: 'section',
    fields: fields.map((f) => mrkdwn(f)),
  };
  if (blockId) block.block_id = blockId;
  return block;
}

export function header(text: string): SlackBlock {
  return { type: 'header', text: plainText(text) };
}

export function divider(): SlackBlock {
  return { type: 'divider' };
}

export function context(elements: string[]): SlackBlock {
  return {
    type: 'context',
    elements: elements.map((e) => mrkdwn(e)) as unknown as SlackElement[],
  };
}

export function actions(elements: SlackElement[], blockId?: string): SlackBlock {
  const block: SlackBlock = { type: 'actions', elements };
  if (blockId) block.block_id = blockId;
  return block;
}

// ---------- Element builders ----------

export function button(
  text: string,
  actionId: string,
  value?: string,
  style?: 'primary' | 'danger'
): SlackElement {
  const el: SlackElement = {
    type: 'button',
    text: plainText(text),
    action_id: actionId,
  };
  if (value) el.value = value;
  if (style) el.style = style;
  return el;
}

export function textInput(
  actionId: string,
  placeholder?: string,
  initialValue?: string,
  multiline?: boolean
): SlackElement {
  const el: SlackElement = {
    type: 'plain_text_input',
    action_id: actionId,
  };
  if (placeholder) el.placeholder = plainText(placeholder);
  if (initialValue) el.initial_value = initialValue;
  if (multiline) el.multiline = true;
  return el;
}

export function staticSelect(
  actionId: string,
  options: SlackOption[],
  initialOption?: SlackOption,
  placeholder?: string
): SlackElement {
  const el: SlackElement = {
    type: 'static_select',
    action_id: actionId,
    options,
  };
  if (initialOption) el.initial_option = initialOption;
  if (placeholder) el.placeholder = plainText(placeholder);
  return el;
}

// ---------- Input block builder (for modals) ----------

export function inputBlock(
  label: string,
  blockId: string,
  element: SlackElement,
  optional = false
): SlackBlock {
  return {
    type: 'input',
    block_id: blockId,
    label: plainText(label),
    element,
    optional,
  };
}

// ---------- Option helper ----------

export function option(text: string, value: string): SlackOption {
  return { text: plainText(text), value };
}
