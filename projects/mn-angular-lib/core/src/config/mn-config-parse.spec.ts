import {parseConfigText} from './mn-config.service';

describe('parseConfigText', () => {
  it('parses strict JSON without the json5 parser', async () => {
    await expectAsync(parseConfigText('{"defaults": {"mn-button": {"size": "md"}}}')).toBeResolvedTo({
      defaults: {'mn-button': {size: 'md'}},
    });
  });

  it('falls back to JSON5 for comments, unquoted keys and trailing commas', async () => {
    const text = `{
      // a comment
      defaults: { 'mn-button': { size: 'lg', }, },
    }`;
    await expectAsync(parseConfigText(text)).toBeResolvedTo({defaults: {'mn-button': {size: 'lg'}}});
  });

  it('rejects text that is neither JSON nor JSON5', async () => {
    await expectAsync(parseConfigText('{ defaults: ')).toBeRejected();
  });
});
