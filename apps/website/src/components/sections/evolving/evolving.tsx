import { component$, useStylesScoped$ } from '@builder.io/qwik';
import { $translate as t } from 'qwik-speak';

import Button, { ButtonPropsTarget, ButtonTheme } from '../../button/button';
import Card from '../../card/card';
import { ContainerTheme } from '../../container/container';
import { IconName } from '../../icon/data';
import Icon from '../../icon/icon';
import Section, { SectionHeader, SectionPadding } from '../../section/section';
import styles from './evolving.css?inline';

export const bundlers = [
  {
    logo: '/bundlers/webpack.svg',
    name: 'Webpack',
    actionHref: 'https://webpack.js.org/concepts/module-federation',
    target: '_blank' as ButtonPropsTarget,
  },
  {
    logo: '/bundlers/rspack.svg',
    name: 'Rspack',
    actionHref: 'https://www.rspack.dev',
    target: '_blank' as ButtonPropsTarget,
  },
  {
    logo: '/bundlers/vite.svg',
    name: 'Vite',
    actionHref: 'https://vitejs.dev',
    target: '_blank' as ButtonPropsTarget,
  },
  {
    logo: '/bundlers/rollup.svg',
    name: 'Rollup',
    actionHref: 'https://rollupjs.org',
    target: '_blank' as ButtonPropsTarget,
  },
  {
    logo: '/bundlers/esbuild.svg',
    name: 'esBuild',
    actionHref: 'https://esbuild.github.io',
    target: '_blank' as ButtonPropsTarget,
  },
];

export default component$(() => {
  useStylesScoped$(styles);

  const cards = [
    {
      title: t('evolving.rfcs.title@@RFCs'),
      subtitle: t(
        'evolving.rfcs.subtitle@@Participate in the community discussions to decide on what features are coming next'
      ),
      actionText: t('evolving.rfcs.action@@Take part now!'),
      actionHref:
        'https://github.com/module-federation/universe/discussions/categories/rfc',
      target: '_blank' as ButtonPropsTarget,
    },
    {
      title: t('evolving.roadmap.title@@Module Federation Roadmap'),
      subtitle: t(
        'evolving.roadmap.subtitle@@Discover the future of Module Federation'
      ),
      actionText: t('evolving.roadmap.action@@Explore it!'),
      actionHref:
        'https://miro.com/app/board/uXjVPvdfG2I=/?share_link_id=45887343083',
      target: '_blank' as ButtonPropsTarget,
    },
  ];

  return (
    <Section padding={SectionPadding.BOTTOM} theme={ContainerTheme.OPAQUE}>
      <SectionHeader
        q:slot="header"
        title={t('evolving.title@@Evolving Module Federation')}
        subtitle={t(
          'evolving.subtitle@@The world of Module Federation is constantly evolving and growing based on the feedback from the community. The RFCs are open for all to participate in the discussion and the roadmap is published.'
        )}
      />
      <div class="flex flex-col gap-3">
        <div class="grid grid grid-cols-1 md:grid-cols-2 gap-3">
          {cards.map((card) => {
            return (
              <Card hover key={card.title}>
                <div class="flex flex-col h-full p-10 gap-6">
                  <h3 class="text-blue-gray-900 font-semibold text-3xl">
                    {card.title}
                  </h3>
                  <p class="font-medium text-blue-gray-900 text-lg">
                    {card.subtitle}
                  </p>

                  <div class="mt-auto">
                    <Button
                      class="w-full md:w-auto"
                      theme={ButtonTheme.SOLID}
                      href={card.actionHref}
                      target={card.target}
                      type="link"
                      small
                    >
                      {card.actionText}

                      <Icon
                        q:slot="suffix"
                        name={IconName.ARROW_NARROW_RIGHT}
                        size="24px"
                      />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <Card hover>
          <div class="flex flex-col justify-center items-center p-10 gap-6">
            <h3 class="text-blue-gray-900 font-semibold text-3xl">
              {t('evolving.supported-bundlers.title@@Supported bundlers')}
            </h3>
            <div class="flex justify-center flex-wrap w-full gap-y-12 gap-x-24">
              {bundlers.map((bundler) => {
                return (
                  <a
                    key={bundler.name}
                    class="flex flex-col items-center "
                    href={bundler.actionHref}
                    target={bundler.target}
                  >
                    <img
                      class="w-24 h-24"
                      src={bundler.logo}
                      alt={bundler.name}
                    />
                    <div class="text-2xl font-semibold text-ui-blue underline decoration-solid decoration-1 underline-offset-2">
                      {bundler.name}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
});
