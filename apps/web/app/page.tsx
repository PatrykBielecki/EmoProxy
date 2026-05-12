'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { surveySubmissionSchema, HARDCODED_MIN_SIZE_PX, HARDCODED_MAX_SIZE_PX, HARDCODED_MIN_SPEED, HARDCODED_MAX_SPEED, scaleToSize, scaleToSpeed, sizeToScale, speedToScale, speedToCyclesPerSecond } from '@repo/shared';
import { HexColorPicker } from 'react-colorful';
import Select, { type SingleValue } from 'react-select';
import countryList from 'react-select-country-list';
import { useI18n } from '../components/providers';
import { parseKeyframesJson } from '../lib/keyframes';

type PublicConfig = {
  surveyConfig: {
    introTitle: string;
    introDescription: string;
    emotionCount: number;
    minSizeScale: number;
    maxSizeScale: number;
    minSpeedScale: number;
    maxSpeedScale: number;
  };
  emotions: Array<{ key: string; label: string; order: number; enabled: boolean }>;
  shapes: Array<{ key: string; name: string; enabled: boolean; svg?: string | null; order: number }>;
  animations: Array<{
    name: string;
    type: string;
    keyframesJson?: string | null;
    enabled: boolean;
  }>;
  additionalFields: Array<{ key: string; enabled: boolean }>;
};

type ResponseItem = {
  emotionKey: string;
  shape: string;
  animationType: string;
  color: string;
  size: number;
  speed: number;
  vad: {
    valence: number;
    arousal: number;
    dominance: number;
  };
};

type CountryOption = {
  value: string;
  label: string;
  flag: string;
};

type ShapeOption = {
  value: string;
  label: string;
};

type AnimationOption = {
  value: string;
  label: string;
};

type Stage = 'welcome' | 'create' | 'vad' | 'demographics' | 'submitted';

const GENDER_OPTIONS = [
  { value: '', labelKey: 'gender.placeholder' as const },
  { value: 'male', labelKey: 'gender.male' as const },
  { value: 'female', labelKey: 'gender.female' as const },
  { value: 'prefer not to say', labelKey: 'gender.preferNotToSay' as const },
  { value: 'different', labelKey: 'gender.different' as const }
];

function shapeStyle(shape: string): CSSProperties {
  if (shape === 'circle') return { borderRadius: '999px' };
  if (shape === 'triangle') return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
  if (shape === 'star') return { clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' };
  if (shape === 'ellipse') return { borderRadius: '40% / 55%' };
  if (shape === 'rhombus') return { clipPath: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' };
  return {};
}

function codeToFlag(code: string) {
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join('');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPreviewDimensions(size: number, animationType: ResponseItem['animationType']) {
  const maxPreviewWidth = 220;
  const maxPreviewHeight = 220;
  const widthScale = animationType === 'stretch' ? 1.3 : animationType === 'scale' ? 1.2 : 1;
  const heightScale = animationType === 'scale' ? 1.2 : 1;
  const extraX = animationType === 'shake' ? 16 : 0;
  const extraY = animationType === 'bounce' ? 20 : 0;
  const requiredWidth = size * widthScale + extraX;
  const requiredHeight = size * heightScale + extraY;
  const fitRatio = Math.min(maxPreviewWidth / requiredWidth, maxPreviewHeight / requiredHeight, 1);

  return {
    width: Math.max(1, size * fitRatio),
    height: Math.max(1, size * fitRatio)
  };
}

function createSvgMaskStyle(svg: string, color: string): CSSProperties {
  const compact = svg.replace(/\n/g, ' ').trim();
  const normalized = /\sxmlns\s*=/i.test(compact)
    ? compact
    : compact.replace(/<svg\b/i, "<svg xmlns='http://www.w3.org/2000/svg'");
  const encoded = encodeURIComponent(normalized);
  const imageUrl = `url("data:image/svg+xml;utf8,${encoded}")`;
  return {
    backgroundColor: color,
    WebkitMaskImage: imageUrl,
    maskImage: imageUrl,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain'
  };
}

function isUsableCustomSvg(svg: string): boolean {
  return /<svg[\s>]/i.test(svg) && /viewBox\s*=\s*['"]0\s+0\s+100\s+100['"]/i.test(svg);
}

function shuffle(values: number[]) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export default function SurveyPage() {
  const { t } = useI18n();
  const selectMenuPortalTarget = typeof window === 'undefined' ? undefined : document.body;
  const selectMenuZIndex = 60;

  const [stage, setStage] = useState<Stage>('welcome');
  const [createStep, setCreateStep] = useState(0);
  const [vadStep, setVadStep] = useState(0);
  const [vadOrder, setVadOrder] = useState<number[]>([]);
  const [demographics, setDemographics] = useState({ age: '', country: '', gender: '' });
  const [responses, setResponses] = useState<ResponseItem[]>([]);

  const countryOptions = useMemo<CountryOption[]>(
    () =>
      countryList().getData().map((country) => ({
        value: country.value,
        label: country.label,
        flag: codeToFlag(country.value)
      })),
    []
  );

  const configQuery = useQuery({
    queryKey: ['public-config'],
    queryFn: () => apiFetch<PublicConfig>('/api/public/config')
  });

  const enabledEmotions = useMemo(
    () =>
      (configQuery.data?.emotions ?? [])
        .filter((emotion) => emotion.enabled)
        .slice(0, configQuery.data?.surveyConfig.emotionCount ?? 0),
    [configQuery.data]
  );

  const enabledShapes = useMemo(() => (configQuery.data?.shapes ?? []).filter((shape) => shape.enabled), [configQuery.data]);
  const enabledAnimations = useMemo(
    () => (configQuery.data?.animations ?? []).filter((animation) => animation.enabled),
    [configQuery.data]
  );
  const enabledAdditionalFieldKeys = useMemo(
    () => new Set((configQuery.data?.additionalFields ?? []).filter((field) => field.enabled).map((field) => field.key)),
    [configQuery.data]
  );
  const showAgeField = enabledAdditionalFieldKeys.has('age');
  const showCountryField = enabledAdditionalFieldKeys.has('country');
  const showGenderField = enabledAdditionalFieldKeys.has('gender');

  const shapeOptions = useMemo<ShapeOption[]>(
    () => enabledShapes.map((shape) => ({ value: shape.key, label: shape.name })),
    [enabledShapes]
  );

  const animationOptions = useMemo<AnimationOption[]>(
    () =>
      enabledAnimations.map((animation) => ({
        value: animation.type as ResponseItem['animationType'],
        label: animation.name
      })),
    [enabledAnimations]
  );
  const customAnimationCss = useMemo(
    () =>
      enabledAnimations
        .map((animation) => {
          const keyframes = parseKeyframesJson(animation.keyframesJson);
          if (!keyframes) return '';
          return `@keyframes custom-${animation.type}{${keyframes}}`;
        })
        .join('\n'),
    [enabledAnimations]
  );

  const defaultAnimation = enabledAnimations[0];

  const createDefaultResponse = (emotionIndex: number): ResponseItem | undefined => {
    const emotion = enabledEmotions[emotionIndex];
    if (!emotion || !defaultAnimation) return undefined;

    return {
      emotionKey: emotion.key,
      shape: enabledShapes[0]?.key ?? 'circle',
      animationType: defaultAnimation.type as ResponseItem['animationType'],
      color: '#b17457',
      size: HARDCODED_MIN_SIZE_PX,
      speed: HARDCODED_MIN_SPEED,
      vad: { valence: 5, arousal: 5, dominance: 5 }
    };
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = surveySubmissionSchema.parse({
        responses,
        demographics: {
          age: showAgeField && demographics.age ? Number(demographics.age) : undefined,
          country: showCountryField ? demographics.country || undefined : undefined,
          gender: showGenderField ? demographics.gender || undefined : undefined
        }
      });

      return apiFetch('/api/survey/session', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      setStage('submitted');
    }
  });

  useEffect(() => {
    if (stage !== 'submitted') return;
    const keepThankYouScreen = () => {
      window.history.pushState(null, '', window.location.pathname);
    };
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', keepThankYouScreen);
    return () => window.removeEventListener('popstate', keepThankYouScreen);
  }, [stage]);

  const upsertResponse = (index: number, patch: Partial<ResponseItem>) => {
    const fallback = createDefaultResponse(index);
    const current = responses[index] ?? fallback;
    if (!current) return;

    setResponses((prev) => {
      const next = [...prev];
      next[index] = {
        ...current,
        ...patch,
        vad: {
          ...current.vad,
          ...(patch.vad ?? {})
        }
      };
      return next;
    });
  };

  if (configQuery.isLoading) return <main className="p-6">{t('common.loading')}</main>;
  if (configQuery.isError || !configQuery.data) return <main className="p-6">{t('survey.loadFailed')}</main>;

  if (!enabledEmotions.length || !enabledAnimations.length || !enabledShapes.length) {
    return <main className="p-6">{t('survey.incompleteConfig')}</main>;
  }

  const currentCreateResponse = responses[createStep] ?? createDefaultResponse(createStep);
  const currentCreateEmotion = enabledEmotions[createStep];
  const currentAnimationPreset = enabledAnimations.find((animation) => animation.type === currentCreateResponse?.animationType) ?? defaultAnimation;

  const currentVadResponseIndex = vadOrder[vadStep];
  const currentVadResponse = currentVadResponseIndex !== undefined ? responses[currentVadResponseIndex] : undefined;

  const getAnimationStyle = (animationType: string, speed: number): { className: string; style: CSSProperties } => {
    const preset = enabledAnimations.find((item) => item.type === animationType);
    const duration = `${Math.max(0.1, 3 - speed)}s`;
    if (preset?.keyframesJson && parseKeyframesJson(preset.keyframesJson)) {
      return { className: '', style: { animationName: `custom-${animationType}`, animationDuration: duration, animationIterationCount: 'infinite' } };
    }
    return { className: `animation-${animationType}`, style: { animationDuration: duration } };
  };
  const getShapeVisualStyle = (shapeKey: string, color: string): CSSProperties => {
    const shapePreset = enabledShapes.find((shape) => shape.key === shapeKey);
    if (shapePreset?.svg?.trim() && isUsableCustomSvg(shapePreset.svg)) return createSvgMaskStyle(shapePreset.svg, color);
    return { backgroundColor: color, ...shapeStyle(shapeKey) };
  };

  if (stage === 'welcome') {
    return (
      <main className="mx-auto mt-8 max-w-3xl rounded-lg bg-[#f4f4f4] p-8 text-[#4a4947] shadow">
        <h1 className="mb-4 text-3xl font-bold">{t('survey.title')}</h1>
        <p className="mb-3">{t('survey.intro1')}</p>
        <p className="mb-3">{t('survey.intro2')}</p>
        <p className="mb-3">{t('survey.intro3')}</p>
        <p className="mb-6">{t('survey.intro4')}</p>
        <button
          className="rounded bg-[#b17457] px-6 py-2 font-medium text-white"
          onClick={() => {
            setStage('create');
            setCreateStep(0);
            setVadStep(0);
            setVadOrder([]);
          }}
        >
          {t('survey.start')}
        </button>
      </main>
    );
  }

  if (stage === 'create' && currentCreateEmotion && currentCreateResponse && currentAnimationPreset) {
    const createPreviewDimensions = getPreviewDimensions(currentCreateResponse.size, currentCreateResponse.animationType);
    const createAnimation = getAnimationStyle(currentCreateResponse.animationType, currentCreateResponse.speed);
    return (
      <main className="mx-auto mt-8 grid max-w-5xl gap-8 p-6 text-[#4a4947] md:grid-cols-2">
        <section className="space-y-4 rounded bg-[#f4f4f4] p-5 shadow">
          <h2 className="text-2xl font-semibold">
            {t('survey.emotion')}: {currentCreateEmotion.label}
          </h2>
          <p className="text-sm">
            {t('survey.stepCreate')} {createStep + 1}/{enabledEmotions.length}
          </p>

          <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t('survey.shape')}</label>
                <Select<ShapeOption, false>
                  options={shapeOptions}
                  value={shapeOptions.find((option) => option.value === currentCreateResponse.shape) ?? null}
                  onChange={(option: SingleValue<ShapeOption>) => {
                    if (!option) return;
                    upsertResponse(createStep, { shape: option.value });
                  }}
                  isSearchable={false}
                  classNamePrefix="shape-select"
                  menuPortalTarget={selectMenuPortalTarget}
                  menuPosition="fixed"
                  formatOptionLabel={(option) => (
                    <div className="flex min-h-12 items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center">
                         <div
                           style={{
                             width: 24,
                             height: 24,
                             ...getShapeVisualStyle(option.value, currentCreateResponse.color)
                           }}
                         />
                      </div>
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                  )}
                  styles={{
                    control: (base) => ({ ...base, borderColor: 'rgba(177, 116, 87, 0.4)', minHeight: 50 }),
                    menu: (base) => ({ ...base, zIndex: selectMenuZIndex }),
                    menuPortal: (base) => ({ ...base, zIndex: selectMenuZIndex }),
                    option: (base) => ({ ...base, minHeight: 56 }),
                    singleValue: (base) => ({ ...base, width: 'calc(100% - 8px)' })
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{t('survey.animationType')}</label>
                <Select<AnimationOption, false>
                  options={animationOptions}
                  value={animationOptions.find((option) => option.value === currentCreateResponse.animationType) ?? null}
                  onChange={(option: SingleValue<AnimationOption>) => {
                    if (!option) return;
                     upsertResponse(createStep, {
                       animationType: option.value,
                       size: clamp(currentCreateResponse.size, HARDCODED_MIN_SIZE_PX, HARDCODED_MAX_SIZE_PX),
                       speed: clamp(currentCreateResponse.speed, HARDCODED_MIN_SPEED, HARDCODED_MAX_SPEED)
                     });
                  }}
                  isSearchable={false}
                  classNamePrefix="animation-select"
                  menuPortalTarget={selectMenuPortalTarget}
                  menuPosition="fixed"
                  formatOptionLabel={(option) => (
                    <div className="flex min-h-12 items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center overflow-visible">
                        <div
                          className={getAnimationStyle(option.value, currentCreateResponse.speed).className}
                          style={{
                            width: 24,
                            height: 24,
                            animationDuration: '1.4s',
                            ...getAnimationStyle(option.value, currentCreateResponse.speed).style,
                            ...getShapeVisualStyle(currentCreateResponse.shape, currentCreateResponse.color)
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                  )}
                  styles={{
                    control: (base) => ({ ...base, borderColor: 'rgba(177, 116, 87, 0.4)', minHeight: 50 }),
                    menu: (base) => ({ ...base, zIndex: selectMenuZIndex }),
                    menuPortal: (base) => ({ ...base, zIndex: selectMenuZIndex }),
                    option: (base) => ({ ...base, minHeight: 56 }),
                    singleValue: (base) => ({ ...base, width: 'calc(100% - 8px)' })
                  }}
                />
              </div>
            </div>

            <div className="rounded border border-[#b17457]/30 bg-white p-3">
              <HexColorPicker color={currentCreateResponse.color} onChange={(color) => upsertResponse(createStep, { color })} />
            </div>
          </div>

          <label className="block text-sm font-medium">
            {t('survey.size')}: {Math.round(sizeToScale(currentCreateResponse.size, configQuery.data.surveyConfig.minSizeScale, configQuery.data.surveyConfig.maxSizeScale))}
          </label>
          <input
            className="w-full accent-[#b17457]"
            type="range"
            min={configQuery.data.surveyConfig.minSizeScale}
            max={configQuery.data.surveyConfig.maxSizeScale}
            step={1}
            value={Math.round(sizeToScale(currentCreateResponse.size, configQuery.data.surveyConfig.minSizeScale, configQuery.data.surveyConfig.maxSizeScale))}
            onChange={(event) => upsertResponse(createStep, { size: scaleToSize(Number(event.target.value), configQuery.data.surveyConfig.minSizeScale, configQuery.data.surveyConfig.maxSizeScale) })}
          />
          <div className="flex justify-between text-xs text-[#4a4947]/60">
            <span>{configQuery.data.surveyConfig.minSizeScale} ({HARDCODED_MIN_SIZE_PX} px)</span>
            <span>{configQuery.data.surveyConfig.maxSizeScale} ({HARDCODED_MAX_SIZE_PX} px)</span>
          </div>

          <label className="block text-sm font-medium">
            {t('survey.speed')}: {Math.round(speedToScale(currentCreateResponse.speed, configQuery.data.surveyConfig.minSpeedScale, configQuery.data.surveyConfig.maxSpeedScale))}
          </label>
          <input
            className="w-full accent-[#b17457]"
            type="range"
            min={configQuery.data.surveyConfig.minSpeedScale}
            max={configQuery.data.surveyConfig.maxSpeedScale}
            step={1}
            value={Math.round(speedToScale(currentCreateResponse.speed, configQuery.data.surveyConfig.minSpeedScale, configQuery.data.surveyConfig.maxSpeedScale))}
            onChange={(event) => upsertResponse(createStep, { speed: scaleToSpeed(Number(event.target.value), configQuery.data.surveyConfig.minSpeedScale, configQuery.data.surveyConfig.maxSpeedScale) })}
          />
          <div className="flex justify-between text-xs text-[#4a4947]/60">
            <span>{configQuery.data.surveyConfig.minSpeedScale} (~{speedToCyclesPerSecond(HARDCODED_MIN_SPEED).toFixed(1)} cycles/s)</span>
            <span>{configQuery.data.surveyConfig.maxSpeedScale} (~{speedToCyclesPerSecond(HARDCODED_MAX_SPEED).toFixed(1)} cycles/s)</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded border border-[#b17457]/40 bg-white px-5 py-2"
              onClick={() => {
                if (createStep === 0) {
                  setStage('welcome');
                  return;
                }
                setCreateStep((value) => value - 1);
              }}
            >
              {t('common.back')}
            </button>
            <button
              className="rounded bg-[#b17457] px-5 py-2 text-white"
              onClick={() => {
                upsertResponse(createStep, {});
                if (createStep + 1 >= enabledEmotions.length) {
                  setVadOrder(shuffle(Array.from({ length: enabledEmotions.length }, (_, index) => index)));
                  setVadStep(0);
                  setStage('vad');
                  return;
                }
                setCreateStep((value) => value + 1);
              }}
            >
              {createStep + 1 >= enabledEmotions.length ? t('survey.continueVad') : t('survey.nextEmotion')}
            </button>
          </div>
        </section>

        <section className="flex min-h-[320px] items-center justify-center rounded bg-[#f4f4f4] p-5 shadow">
          <div
            className={createAnimation.className}
            style={{
              width: `${createPreviewDimensions.width}px`,
              height: `${createPreviewDimensions.height}px`,
              ...createAnimation.style,
              ...getShapeVisualStyle(currentCreateResponse.shape, currentCreateResponse.color)
            }}
          />
        </section>
        {customAnimationCss && <style>{customAnimationCss}</style>}
      </main>
    );
  }

  if (stage === 'create') {
    return <main className="p-6">{t('survey.incompleteConfig')}</main>;
  }

  if (stage === 'vad' && currentVadResponse) {
    const vadPreviewDimensions = getPreviewDimensions(currentVadResponse.size, currentVadResponse.animationType);
    const vadAnimation = getAnimationStyle(currentVadResponse.animationType, currentVadResponse.speed);
    const vadLabelByKey = {
      valence: t('survey.valence'),
      arousal: t('survey.arousal'),
      dominance: t('survey.dominance')
    } as const;
    return (
      <main className="mx-auto mt-8 grid max-w-5xl gap-8 p-6 text-[#4a4947] md:grid-cols-2">
        <section className="space-y-4 rounded bg-[#f4f4f4] p-5 shadow">
          <h2 className="text-2xl font-semibold">{t('survey.rateAnimation')}</h2>
          <p className="text-sm">
            {t('survey.stepVad')} {vadStep + 1}/{vadOrder.length}
          </p>
          <p className="text-sm">{t('survey.noEmotionLabel')}</p>

          {(['valence', 'arousal', 'dominance'] as const).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium capitalize">
                {vadLabelByKey[key]}: {currentVadResponse.vad[key]}
              </label>
              <input
                className="w-full accent-[#b17457]"
                type="range"
                min={0}
                max={10}
                step={1}
                value={currentVadResponse.vad[key]}
                onChange={(event) =>
                  upsertResponse(currentVadResponseIndex, {
                    vad: {
                      ...currentVadResponse.vad,
                      [key]: Number(event.target.value)
                    }
                  })
                }
              />
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded border border-[#b17457]/40 bg-white px-5 py-2"
              onClick={() => {
                if (vadStep === 0) {
                  setStage('create');
                  setCreateStep(enabledEmotions.length - 1);
                  return;
                }
                setVadStep((value) => value - 1);
              }}
            >
              {t('common.back')}
            </button>
            <button
              className="rounded bg-[#b17457] px-5 py-2 text-white"
              onClick={() => {
                if (vadStep + 1 >= vadOrder.length) {
                  setStage('demographics');
                  return;
                }
                setVadStep((value) => value + 1);
              }}
            >
              {vadStep + 1 >= vadOrder.length ? t('survey.continueDemographics') : t('survey.nextAnimation')}
            </button>
          </div>
        </section>

        <section className="flex min-h-[320px] items-center justify-center rounded bg-[#f4f4f4] p-5 shadow">
          <div
            className={vadAnimation.className}
            style={{
              width: `${vadPreviewDimensions.width}px`,
              height: `${vadPreviewDimensions.height}px`,
              ...vadAnimation.style,
              ...getShapeVisualStyle(currentVadResponse.shape, currentVadResponse.color)
            }}
          />
        </section>
        {customAnimationCss && <style>{customAnimationCss}</style>}
      </main>
    );
  }

  if (stage === 'vad') {
    return <main className="p-6">{t('survey.preparingAnimations')}</main>;
  }

  if (stage === 'submitted') {
    return (
      <main className="mx-auto mt-8 max-w-xl rounded bg-[#f4f4f4] p-6 text-[#4a4947] shadow">
        <h2 className="mb-2 text-2xl font-semibold">{t('survey.thankYouTitle')}</h2>
        <p className="text-sm">{t('survey.thankYouDesc')}</p>
      </main>
    );
  }

  const selectedCountry = countryOptions.find((option) => option.value === demographics.country) ?? null;

  return (
    <main className="mx-auto mt-8 max-w-xl rounded bg-[#f4f4f4] p-6 text-[#4a4947] shadow">
      <h2 className="mb-1 text-2xl font-semibold">{t('survey.userDetailsTitle')}</h2>
      <p className="mb-4 text-sm">{t('survey.userDetailsDesc')}</p>

      <div className="space-y-3">
        {showAgeField && (
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('survey.age')}</span>
            <input
              className="w-full rounded border border-[#b17457]/40 bg-white p-2"
              placeholder={t('survey.age')}
              type="number"
              min={1}
              max={120}
              value={demographics.age}
              onChange={(event) => setDemographics((state) => ({ ...state, age: event.target.value }))}
            />
          </label>
        )}

        {showCountryField && (
          <div>
            <label className="mb-1 block text-sm font-medium">{t('survey.country')}</label>
            <Select<CountryOption, false>
              options={countryOptions}
              value={selectedCountry}
              isSearchable
              placeholder={t('survey.country')}
              classNamePrefix="country-select"
              menuPortalTarget={selectMenuPortalTarget}
              menuPosition="fixed"
              onChange={(option: SingleValue<CountryOption>) =>
                setDemographics((state) => ({
                  ...state,
                  country: option?.value ?? ''
                }))
              }
              formatOptionLabel={(option) => (
                <div className="flex items-center gap-2">
                  <span>{option.flag}</span>
                  <span>{option.label}</span>
                </div>
              )}
              styles={{
                control: (base) => ({ ...base, borderColor: 'rgba(177, 116, 87, 0.4)', minHeight: 42 }),
                menu: (base) => ({ ...base, zIndex: selectMenuZIndex }),
                menuPortal: (base) => ({ ...base, zIndex: selectMenuZIndex }),
                option: (base) => ({ ...base, minHeight: 44, display: 'flex', alignItems: 'center' })
              }}
            />
          </div>
        )}

        {showGenderField && (
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('survey.gender')}</span>
            <select
              className="w-full rounded border border-[#b17457]/40 bg-white p-2"
              value={demographics.gender}
              onChange={(event) => setDemographics((state) => ({ ...state, gender: event.target.value }))}
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded border border-[#b17457]/40 bg-white px-5 py-2"
            onClick={() => {
              setStage('vad');
              setVadStep(Math.max(0, vadOrder.length - 1));
            }}
          >
            {t('common.back')}
          </button>

          <button
            className="rounded bg-[#b17457] px-5 py-2 text-white disabled:opacity-50"
            disabled={submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? t('survey.submitting') : t('survey.submit')}
          </button>
        </div>
      </div>

      {submitMutation.isError && <p className="mt-4 text-red-700">{t('survey.submitFailed')}</p>}
    </main>
  );
}
