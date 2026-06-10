<page url="/en/docs/react/components/accordion">
# Accordion

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/accordion
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(navigation)/accordion.mdx
> A collapsible content panel for organizing information in a compact space


***

## Import

```tsx
import { Accordion } from '@heroui/react';

```

### Usage

```tsx
import {
  ArrowsRotateLeft,
  Box,
  ChevronDown,
  CreditCard,
  PlanetEarth,
  Receipt,
  ShoppingBag,
} from "@gravity-ui/icons";
import {Accordion} from "@heroui/react";

const items = [
  {
    content:
      "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
    icon: <ShoppingBag />,
    title: "How do I place an order?",
  },
  {
    content:
      "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
    icon: <Receipt />,
    title: "Can I modify or cancel my order?",
  },
  {
    content: "We accept all major credit cards, including Visa, Mastercard, and American Express.",
    icon: <CreditCard />,
    title: "What payment methods do you accept?",
  },
  {
    content:
      "Shipping costs vary based on your location and the size of your order. We offer free shipping for orders over $50.",
    icon: <Box />,
    title: "How much does shipping cost?",
  },
  {
    content:
      "Yes, we ship to most countries. Please check our shipping rates and policies for more information.",
    icon: <PlanetEarth />,
    title: "Do you ship internationally?",
  },
  {
    content:
      "If you're not satisfied with your purchase, you can request a refund within 30 days of purchase. Please contact our customer support team for assistance.",
    icon: <ArrowsRotateLeft />,
    title: "How do I request a refund?",
  },
];

export function Basic() {
  return (
    <Accordion className="w-full max-w-md">
      {items.map((item, index) => (
        <Accordion.Item key={index}>
          <Accordion.Heading>
            <Accordion.Trigger>
              {item.icon ? (
                <span className="mr-3 size-4 shrink-0 text-muted">{item.icon}</span>
              ) : null}
              {item.title}
              <Accordion.Indicator>
                <ChevronDown />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>{item.content}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

```

### Anatomy

Import the Accordion component and access all parts using dot notation.

```tsx
import { Accordion } from '@heroui/react';

export default () => (
  <Accordion>
    <Accordion.Item>
      <Accordion.Heading>
        <Accordion.Trigger>
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body/>
      </Accordion.Panel>
    </Accordion.Item>
  </Accordion>
)

```

### Surface

```tsx
import {
  ArrowsRotateLeft,
  Box,
  ChevronDown,
  CreditCard,
  PlanetEarth,
  Receipt,
  ShoppingBag,
} from "@gravity-ui/icons";
import {Accordion} from "@heroui/react";

const items = [
  {
    content:
      "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
    icon: <ShoppingBag />,
    title: "How do I place an order?",
  },
  {
    content:
      "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
    icon: <Receipt />,
    title: "Can I modify or cancel my order?",
  },
  {
    content: "We accept all major credit cards, including Visa, Mastercard, and American Express.",
    icon: <CreditCard />,
    title: "What payment methods do you accept?",
  },
  {
    content:
      "Shipping costs vary based on your location and the size of your order. We offer free shipping for orders over $50.",
    icon: <Box />,
    title: "How much does shipping cost?",
  },
  {
    content:
      "Yes, we ship to most countries. Please check our shipping rates and policies for more information.",
    icon: <PlanetEarth />,
    title: "Do you ship internationally?",
  },
  {
    content:
      "If you're not satisfied with your purchase, you can request a refund within 30 days of purchase. Please contact our customer support team for assistance.",
    icon: <ArrowsRotateLeft />,
    title: "How do I request a refund?",
  },
];

export function Surface() {
  return (
    <Accordion className="w-full max-w-md" variant="surface">
      {items.map((item, index) => (
        <Accordion.Item key={index}>
          <Accordion.Heading>
            <Accordion.Trigger>
              {item.icon ? (
                <span className="mr-3 size-4 shrink-0 text-muted">{item.icon}</span>
              ) : null}
              {item.title}
              <Accordion.Indicator>
                <ChevronDown />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>{item.content}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

```

### Multiple Expanded

```tsx
import {Accordion} from "@heroui/react";

export function Multiple() {
  return (
    <Accordion allowsMultipleExpanded className="w-full max-w-md">
      <Accordion.Item>
        <Accordion.Heading>
          <Accordion.Trigger>
            Getting Started
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            Learn the basics of HeroUI and how to integrate it into your React project. This section
            covers installation, setup, and your first component.
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item>
        <Accordion.Heading>
          <Accordion.Trigger>
            Core Concepts
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            Understand the fundamental concepts behind HeroUI, including the compound component
            pattern, styling with Tailwind CSS, and accessibility features.
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item>
        <Accordion.Heading>
          <Accordion.Trigger>
            Advanced Usage
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            Explore advanced features like custom variants, theme customization, and integration
            with other libraries in your React ecosystem.
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item>
        <Accordion.Heading>
          <Accordion.Trigger>
            Best Practices
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            Follow our recommended best practices for building performant, accessible, and
            maintainable applications with HeroUI components.
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

```

### Controlled

```tsx
"use client";

import {ChevronDown, ChevronUp} from "@gravity-ui/icons";
import {Accordion, Button, useDisclosureGroupNavigation} from "@heroui/react";
import React from "react";

const items = [
  {
    content:
      "Learn the basics of HeroUI and how to integrate it into your React project. This section covers installation, setup, and your first component.",
    id: "getting-started",
    title: "Getting Started",
  },
  {
    content:
      "Understand the fundamental concepts behind HeroUI, including the compound component pattern, styling with Tailwind CSS, and accessibility features.",
    id: "core-concepts",
    title: "Core Concepts",
  },
  {
    content:
      "Explore advanced features like custom variants, theme customization, and integration with other libraries in your React ecosystem.",
    id: "advanced-usage",
    title: "Advanced Usage",
  },
];

export function Controlled() {
  const [expandedKeys, setExpandedKeys] = React.useState(
    new Set<string | number>(["getting-started"]),
  );
  const itemIds = items.map((item) => item.id);

  const {isNextDisabled, isPrevDisabled, onNext, onPrevious} = useDisclosureGroupNavigation({
    expandedKeys,
    itemIds,
    onExpandedChange: setExpandedKeys,
  });

  return (
    <div className="w-full max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          Expanded: <strong>{[...expandedKeys].join(", ") || "none"}</strong>
        </p>
        <div className="flex gap-2">
          <Button
            aria-label="Previous item"
            isDisabled={isPrevDisabled}
            size="sm"
            variant="secondary"
            onPress={onPrevious}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            aria-label="Next item"
            isDisabled={isNextDisabled}
            size="sm"
            variant="secondary"
            onPress={onNext}
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>
      </div>
      <Accordion expandedKeys={expandedKeys} onExpandedChange={setExpandedKeys}>
        {items.map((item) => (
          <Accordion.Item key={item.id} id={item.id}>
            <Accordion.Heading>
              <Accordion.Trigger>
                {item.title}
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>{item.content}</Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  );
}

```

### Custom Indicator

```tsx
"use client";

import type {Key} from "@heroui/react";

import {ChevronsDown, CircleChevronDown, Minus, Plus} from "@gravity-ui/icons";
import {Accordion} from "@heroui/react";
import React from "react";

export function CustomIndicator() {
  const [expandedKeys, setExpandedKeys] = React.useState<Set<Key>>(new Set([""]));

  return (
    <Accordion
      className="w-full max-w-md"
      expandedKeys={expandedKeys}
      variant="surface"
      onExpandedChange={setExpandedKeys}
    >
      <Accordion.Item id="1">
        <Accordion.Heading>
          <Accordion.Trigger>
            Using Plus/Minus Icon
            <Accordion.Indicator>
              {expandedKeys.has("1") ? <Minus /> : <Plus />}
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            This accordion uses a plus icon that transforms when expanded. The icon automatically
            rotates 45 degrees to form an X.
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item id="2">
        <Accordion.Heading>
          <Accordion.Trigger>
            Using Caret Icon
            <Accordion.Indicator>
              <CircleChevronDown />
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            This item uses a caret icon for the indicator. The rotation animation is applied
            automatically.
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item id="3">
        <Accordion.Heading>
          <Accordion.Trigger>
            Using Arrow Icon
            <Accordion.Indicator>
              <ChevronsDown />
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            This item uses an arrow icon. Any icon you pass will receive the rotation animation when
            the item expands.
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

```

### Disabled State

```tsx
import {Accordion} from "@heroui/react";

export function Disabled() {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="w-full max-w-md space-y-2">
        <h3 className="text-sm font-medium text-muted">Entire accordion disabled</h3>
        <Accordion isDisabled className="w-full max-w-md">
          <Accordion.Item>
            <Accordion.Heading>
              <Accordion.Trigger>
                Disabled Item 1
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                This content cannot be accessed when the accordion is disabled.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item>
            <Accordion.Heading>
              <Accordion.Trigger>
                Disabled Item 2
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                This content cannot be accessed when the accordion is disabled.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>

      <div className="w-full max-w-md space-y-2">
        <h3 className="text-sm font-medium text-muted">Individual items disabled</h3>
        <Accordion className="w-full max-w-md">
          <Accordion.Item>
            <Accordion.Heading>
              <Accordion.Trigger>
                Active Item
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>This item is active and can be toggled normally.</Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item isDisabled>
            <Accordion.Heading>
              <Accordion.Trigger>
                Disabled Item
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                This content cannot be accessed when the item is disabled.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item>
            <Accordion.Heading>
              <Accordion.Trigger>
                Another Active Item
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>This item is also active and can be toggled.</Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
}

```

### FAQ Layout

```tsx
import {ChevronDown} from "@gravity-ui/icons";
import {Accordion} from "@heroui/react";

export function FAQ() {
  const categories = [
    {
      items: [
        {
          content:
            "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
          title: "How do I place an order?",
        },
        {
          content:
            "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
          title: "Can I modify or cancel my order?",
        },
      ],
      title: "General",
    },
    {
      items: [
        {
          content:
            "You can purchase a license directly from our website. Select the license type that fits your needs and proceed to checkout.",
          title: "How do I purchase a license?",
        },
        {
          content:
            "A standard license is for personal use or small projects, while a pro license includes commercial use rights and priority support.",
          title: "What is the difference between a standard and a pro license?",
        },
      ],
      title: "Licensing",
    },
    {
      items: [
        {
          content:
            "You can reach our support team through the contact form on our website, or email us directly at support@example.com.",
          title: "How do I get support?",
        },
      ],
      title: "Support",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <p className="mb-4 text-lg font-medium text-muted">
          Everything you need to know about licensing and usage.
        </p>
      </div>
      {categories.map((category) => (
        <div key={category.title}>
          <p className="text-md mb-2 font-medium text-muted">{category.title}</p>
          <Accordion className="w-full" variant="surface">
            {category.items.map((item, index) => (
              <Accordion.Item key={index}>
                <Accordion.Heading>
                  <Accordion.Trigger>
                    {item.title}
                    <Accordion.Indicator>
                      <ChevronDown />
                    </Accordion.Indicator>
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>{item.content}</Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}

```

### Custom Styles

```tsx
import {ChevronDown} from "@gravity-ui/icons";
import {Accordion, cn} from "@heroui/react";

const items = [
  {
    content: "Stay informed about your account activity with real-time notifications. ",
    iconUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/3dicons/bell-small.png",
    subtitle: "Receive account activity updates",
    title: "Set Up Notifications",
  },
  {
    content: "Enhance your browsing experience by installing our official browser extension",
    iconUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/3dicons/compass-small.png",
    subtitle: "Connect you browser to your account",
    title: "Set up Browser Extension",
  },
  {
    content:
      "Begin your journey into the world of digital collectibles by creating your first NFT. ",
    iconUrl:
      "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/3dicons/mint-collective-small.png",
    subtitle: "Create your first collectible",
    title: "Mint Collectible",
  },
];

export function CustomStyles() {
  return (
    <Accordion className="bg-surface-1/10 w-full max-w-md rounded-2xl" variant="surface">
      {items.map((item, index) => (
        <Accordion.Item
          key={index}
          className={cn(
            "group/item",
            "first:[&_[data-slot=accordion-trigger]]:rounded-t-2xl", // First trigger we want to round the top
            "last:[&:not(:has([data-slot=accordion-trigger][aria-expanded='true']))_[data-slot=accordion-trigger]]:rounded-b-2xl", // Last trigger we want to round the bottom
          )}
        >
          <Accordion.Heading>
            <Accordion.Trigger className="hover:bgsurface group flex items-center gap-2 transition-none">
              {item.iconUrl ? (
                <img
                  alt={item.title}
                  className="h-11 w-11 transition-[scale,rotate] duration-300 ease-out group-hover/item:scale-120 group-hover/item:-rotate-10 group-hover/item:drop-shadow-lg"
                  src={item.iconUrl}
                />
              ) : null}
              <div className="flex flex-col gap-0">
                <span className="leading-5 font-medium">{item.title}</span>
                <span className="leading-6 font-normal text-muted/80">{item.subtitle}</span>
              </div>
              <Accordion.Indicator className="text-muted/50 [&>svg]:size-4">
                <ChevronDown />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="text-muted/80">{item.content}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

```

### Without Separator

```tsx
import {ChevronDown, CreditCard, Receipt, ShoppingBag} from "@gravity-ui/icons";
import {Accordion} from "@heroui/react";

const items = [
  {
    content:
      "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
    icon: <ShoppingBag />,
    title: "How do I place an order?",
  },
  {
    content:
      "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
    icon: <Receipt />,
    title: "Can I modify or cancel my order?",
  },
  {
    content: "We accept all major credit cards, including Visa, Mastercard, and American Express.",
    icon: <CreditCard />,
    title: "What payment methods do you accept?",
  },
];

export function WithoutSeparator() {
  return (
    <Accordion hideSeparator className="w-full max-w-md">
      {items.map((item, index) => (
        <Accordion.Item key={index}>
          <Accordion.Heading>
            <Accordion.Trigger>
              {item.icon ? (
                <span className="mr-3 size-4 shrink-0 text-muted">{item.icon}</span>
              ) : null}
              {item.title}
              <Accordion.Indicator>
                <ChevronDown />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>{item.content}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

```

### Custom Render Function

```tsx
"use client";

import {
  ArrowsRotateLeft,
  Box,
  ChevronDown,
  CreditCard,
  PlanetEarth,
  Receipt,
  ShoppingBag,
} from "@gravity-ui/icons";
import {Accordion} from "@heroui/react";

const items = [
  {
    content:
      "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
    icon: <ShoppingBag />,
    title: "How do I place an order?",
  },
  {
    content:
      "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
    icon: <Receipt />,
    title: "Can I modify or cancel my order?",
  },
  {
    content: "We accept all major credit cards, including Visa, Mastercard, and American Express.",
    icon: <CreditCard />,
    title: "What payment methods do you accept?",
  },
  {
    content:
      "Shipping costs vary based on your location and the size of your order. We offer free shipping for orders over $50.",
    icon: <Box />,
    title: "How much does shipping cost?",
  },
  {
    content:
      "Yes, we ship to most countries. Please check our shipping rates and policies for more information.",
    icon: <PlanetEarth />,
    title: "Do you ship internationally?",
  },
  {
    content:
      "If you're not satisfied with your purchase, you can request a refund within 30 days of purchase. Please contact our customer support team for assistance.",
    icon: <ArrowsRotateLeft />,
    title: "How do I request a refund?",
  },
];

export function CustomRenderFunction() {
  return (
    <Accordion
      className="w-full max-w-md"
      render={(props) => <div data-custom="accordion" {...props} />}
    >
      {items.map((item, index) => (
        <Accordion.Item key={index} render={(props) => <div data-custom="item" {...props} />}>
          <Accordion.Heading render={(props) => <div data-custom="heading" {...props} />}>
            <Accordion.Trigger render={(props) => <button data-custom="trigger" {...props} />}>
              {item.icon ? (
                <span className="mr-3 size-4 shrink-0 text-muted">{item.icon}</span>
              ) : null}
              {item.title}
              <Accordion.Indicator>
                <ChevronDown />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel render={(props) => <div data-custom="panel" {...props} />}>
            <Accordion.Body>{item.content}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

```

## Related Components

- **DisclosureGroup**: Group of collapsible panels
- **Disclosure**: Single collapsible content section

## Styling

### Passing Tailwind CSS classes

```tsx
"use client";

import { Accordion, cn } from "@heroui/react";
import {Icon} from "@iconify/react";

const items = [
  {
    content:
      "Stay informed about your account activity with real-time notifications. You'll receive instant alerts for important events like transactions, new messages, security updates, and system announcements. ",
    iconUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/3dicons/bell-small.png",
    title: "Set Up Notifications",
    subtitle: "Receive account activity updates",
  },
  {
    content:
      "Enhance your browsing experience by installing our official browser extension. The extension provides seamless integration with your account, allowing you to receive notifications directly in your browser, quickly access your dashboard, and interact with web3 applications securely. Compatible with Chrome, Firefox, Edge, and Brave browsers.",
    iconUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/3dicons/compass-small.png",
    title: "Set up Browser Extension",
    subtitle: "Connect you browser to your account",
  },
  {
    content:
      "Begin your journey into the world of digital collectibles by creating your first NFT. Our intuitive minting process guides you through uploading your artwork, setting metadata, choosing royalty percentages, and deploying to the blockchain. Whether you're an artist, creator, or collector, you'll find all the tools you need to bring your digital assets to life. Your collectibles are stored on IPFS for permanent decentralized storage.",
    iconUrl:
      "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/3dicons/mint-collective-small.png",
    title: "Mint Collectible",
    subtitle: "Create your first collectible",
  },
];

export function CustomStyles() {
  return (
    <Accordion className="bg-surface-secondary w-full max-w-md rounded-2xl" variant="surface">
      {items.map((item, index) => (
        <Accordion.Item
          key={index}
          className={cn(
            "group/item",
            "first:[&_[data-slot=accordion-trigger]]:rounded-t-2xl", // First trigger we want to round the top
            "last:[&:not(:has([data-slot=accordion-trigger][aria-expanded='true']))_[data-slot=accordion-trigger]]:rounded-b-2xl", // Last trigger we want to round the bottom
          )}
        >
          <Accordion.Heading>
            <Accordion.Trigger className="hover:bg-surface-tertiary group flex items-center gap-2">
              {item.iconUrl ? (
                <img
                  alt={item.title}
                  className="group-hover/item:scale-120 group-hover/item:-rotate-10 h-11 w-11 transition-[scale,rotate] duration-300 ease-out group-hover/item:drop-shadow-lg"
                  src={item.iconUrl}
                />
              ) : null}
              <div className="flex flex-col gap-0">
                <span className="font-medium leading-5">{item.title}</span>
                <span className="text-muted/80 font-normal leading-6">{item.subtitle}</span>
              </div>
              <Accordion.Indicator className="text-muted/50 [&>svg]:size-4">
                <Icon icon="gravity-ui:chevron-down" />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="text-muted/80">{item.content}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

```

### Customizing the component classes

To customize the Accordion component classes, you can use the `@layer components` directive.
<br/>[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .accordion {
    @apply rounded-xl bg-gray-50;
  }

  .accordion__trigger {
    @apply font-semibold text-lg;
  }

  .accordion--outline {
    @apply shadow-lg border-2;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Accordion component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/accordion.css)):

#### Base Classes

- `.accordion` - Base accordion container
- `.accordion__body` - Content body container
- `.accordion__heading` - Heading wrapper
- `.accordion__indicator` - Expand/collapse indicator icon
- `.accordion__item` - Individual accordion item
- `.accordion__panel` - Collapsible panel container
- `.accordion__trigger` - Clickable trigger button

#### Variant Classes

- `.accordion--outline` - Outline variant with border and background

#### State Classes

- `.accordion__trigger[aria-expanded="true"]` - Expanded state
- `.accordion__panel[aria-hidden="false"]` - Panel visible state

### Interactive States

The component supports both CSS pseudo-classes and data attributes for flexibility:

- **Hover**: `:hover` or `[data-hovered="true"]` on trigger
- **Focus**: `:focus-visible` or `[data-focus-visible="true"]` on trigger
- **Disabled**: `:disabled` or `[aria-disabled="true"]` on trigger
- **Expanded**: `[aria-expanded="true"]` on trigger

## API Reference

### Accordion Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `allowsMultipleExpanded` | `boolean` | `false` | Whether multiple items can be expanded at once |
| `defaultExpandedKeys` | `Iterable<Key>` | - | The initial expanded keys |
| `expandedKeys` | `Iterable<Key>` | - | The controlled expanded keys |
| `onExpandedChange` | `(keys: Set<Key>) => void` | - | Handler called when expanded keys change |
| `isDisabled` | `boolean` | `false` | Whether the entire accordion is disabled |
| `variant` | `"default" \| "surface"` | `"default"` | The visual variant of the accordion |
| `hideSeparator` | `boolean` | `false` | Hide separator lines between accordion items |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | The accordion items |
| `render` | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, AccordionRenderProps>` | - | Overrides the default DOM element with a custom render function.|

### Accordion.Item Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `Key` | - | Unique identifier for the item |
| `isDisabled` | `boolean` | `false` | Whether this item is disabled |
| `defaultExpanded` | `boolean` | `false` | Whether item is initially expanded |
| `isExpanded` | `boolean` | - | Controlled expanded state |
| `onExpandedChange` | `(isExpanded: boolean) => void` | - | Handler for expanded state changes |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | The item content |
| `render` | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, AccordionItemRenderProps>` | - | Overrides the default DOM element with a custom render function.|

### Accordion.Trigger Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode \| RenderFunction` | - | Trigger content or render function |
| `onPress` | `() => void` | - | Additional press handler |
| `isDisabled` | `boolean` | - | Whether trigger is disabled |
| `render` | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, TriggerRenderProps>` | - | Overrides the default DOM element with a custom render function.|

### Accordion.Panel Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Panel content |
| `render` | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, AccordionPanelRenderProps>` | - | Overrides the default DOM element with a custom render function.|

### Accordion.Indicator Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Custom indicator icon |

### Accordion.Body Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Body content |
</page>

<page url="/en/docs/react/components/alert">
# Alert

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/alert
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(feedback)/alert.mdx
> Display important messages and notifications to users with status indicators


***

## Import

```tsx
import { Alert } from '@heroui/react';

```

### Usage

```tsx
import {Alert, Button, CloseButton, Spinner} from "@heroui/react";
import React from "react";

export function Basic() {
  return (
    <div className="grid w-full max-w-xl gap-4">
      {/* Default - General information */}
      <Alert>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>New features available</Alert.Title>
          <Alert.Description>
            Check out our latest updates including dark mode support and improved accessibility
            features.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {/* Accent - Important information with action */}
      <Alert status="accent">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Update available</Alert.Title>
          <Alert.Description>
            A new version of the application is available. Please refresh to get the latest features
            and bug fixes.
          </Alert.Description>
          <Button className="mt-2 sm:hidden" size="sm" variant="primary">
            Refresh
          </Button>
        </Alert.Content>
        <Button className="hidden sm:block" size="sm" variant="primary">
          Refresh
        </Button>
      </Alert>

      {/* Danger - Error with detailed steps */}
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Unable to connect to server</Alert.Title>
          <Alert.Description>
            We're experiencing connection issues. Please try the following:
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li>Check your internet connection</li>
              <li>Refresh the page</li>
              <li>Clear your browser cache</li>
            </ul>
          </Alert.Description>
          <Button className="mt-2 sm:hidden" size="sm" variant="danger">
            Retry
          </Button>
        </Alert.Content>
        <Button className="hidden sm:block" size="sm" variant="danger">
          Retry
        </Button>
      </Alert>

      {/* Without description */}
      <Alert status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Profile updated successfully</Alert.Title>
        </Alert.Content>
        <CloseButton />
      </Alert>

      {/* Custom indicator - Loading state */}
      <Alert status="accent">
        <Alert.Indicator>
          <Spinner size="sm" />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>Processing your request</Alert.Title>
          <Alert.Description>
            Please wait while we sync your data. This may take a few moments.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {/* Without close button */}
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Scheduled maintenance</Alert.Title>
          <Alert.Description>
            Our services will be unavailable on Sunday, March 15th from 2:00 AM to 6:00 AM UTC for
            scheduled maintenance.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    </div>
  );
}

```

### Anatomy

Import the Alert component and access all parts using dot notation.

```tsx
import { Alert } from '@heroui/react';

export default () => (
  <Alert>
    <Alert.Indicator />
    <Alert.Content>
      <Alert.Title />
      <Alert.Description />
    </Alert.Content>
  </Alert>
)

```

## Related Components

- **CloseButton**: Button for dismissing overlays
- **Button**: Allows a user to perform an action
- **Spinner**: Loading indicator

## Styling

### Passing Tailwind CSS classes

```tsx
import { Alert } from "@heroui/react";

function CustomAlert() {
  return (
    <Alert className="border-2 border-blue-500 rounded-xl" status="accent">
      <Alert.Indicator className="text-blue-600" />
      <Alert.Content className="gap-1">
        <Alert.Title className="font-bold text-lg">Custom Alert</Alert.Title>
        <Alert.Description className="text-sm opacity-80">
          This alert has custom styling applied
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

```

### Customizing the component classes

To customize the Alert component classes, you can use the `@layer components` directive.
<br/>[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .alert {
    @apply rounded-2xl shadow-lg;
  }

  .alert__title {
    @apply font-bold text-lg;
  }

  .alert--danger {
    @apply border-l-4 border-red-600;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Alert component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/alert.css)):

#### Base Classes

- `.alert` - Base alert container
- `.alert__indicator` - Icon/indicator container
- `.alert__content` - Content wrapper for title and description
- `.alert__title` - Alert title text
- `.alert__description` - Alert description text

#### Status Variant Classes

- `.alert--default` - Default gray status
- `.alert--accent` - Accent blue status
- `.alert--success` - Success green status
- `.alert--warning` - Warning yellow/orange status
- `.alert--danger` - Danger red status

### Interactive States

The Alert component is primarily informational and doesn't have interactive states on the base component. However, it can contain interactive elements like buttons or close buttons.

## API Reference

### Alert Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `"default" \| "accent" \| "success" \| "warning" \| "danger"` | `"default"` | The visual status of the alert |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | The alert content |

### Alert.Indicator Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Custom indicator icon (defaults to status icon) |

### Alert.Content Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Content (typically Title and Description) |

### Alert.Title Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | The alert title text |

### Alert.Description Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | The alert description text |
</page>

<page url="/en/docs/react/components/alert-dialog">
# AlertDialog

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/alert-dialog
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(overlays)/alert-dialog.mdx
> Modal dialog for critical confirmations requiring user attention and explicit action


***

## Import

```tsx
import { AlertDialog } from "@heroui/react";

```

### Usage

```tsx
"use client";

import {AlertDialog, Button} from "@heroui/react";

export function Default() {
  return (
    <AlertDialog>
      <Button variant="danger">Delete Project</Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete project permanently?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                This will permanently delete <strong>My Awesome Project</strong> and all of its
                data. This action cannot be undone.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button slot="close" variant="danger">
                Delete Project
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

```

### Anatomy

Import the AlertDialog component and access all parts using dot notation.

```tsx
import {AlertDialog, Button} from "@heroui/react";

export default () => (
  <AlertDialog>
    <Button>Open Alert Dialog</Button>
    <AlertDialog.Backdrop>
      <AlertDialog.Container>
        <AlertDialog.Dialog>
          <AlertDialog.CloseTrigger /> {/* Optional: Close button */}
          <AlertDialog.Header>
            <AlertDialog.Icon /> {/* Optional: Status icon */}
            <AlertDialog.Heading />
          </AlertDialog.Header>
          <AlertDialog.Body />
          <AlertDialog.Footer />
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  </AlertDialog>
);

```

### Statuses

```tsx
"use client";

import {AlertDialog, Button} from "@heroui/react";

export function Statuses() {
  const examples = [
    {
      actions: {
        cancel: "Stay Signed In",
        confirm: "Sign Out",
      },
      body: "You'll need to sign in again to access your account. Any unsaved changes will be lost.",
      classNames: "bg-accent-soft text-accent-soft-foreground",
      header: "Sign out of your account?",
      status: "accent",
      trigger: "Sign Out",
    },
    {
      actions: {
        cancel: "Not Yet",
        confirm: "Mark Complete",
      },
      body: "This will mark the task as complete and notify all team members. The task will be moved to your completed list.",
      classNames: "bg-success-soft text-success-soft-foreground",
      header: "Complete this task?",
      status: "success",
      trigger: "Complete Task",
    },
    {
      actions: {
        cancel: "Keep Editing",
        confirm: "Discard",
      },
      body: "You have unsaved changes that will be permanently lost. Are you sure you want to discard them?",
      classNames: "bg-warning-soft text-warning-soft-foreground",
      header: "Discard unsaved changes?",
      status: "warning",
      trigger: "Discard Changes",
    },
    {
      actions: {
        cancel: "Cancel",
        confirm: "Delete Account",
      },
      body: "This will permanently delete your account and remove all your data from our servers. This action is irreversible.",
      classNames: "bg-danger-soft text-danger-soft-foreground",
      header: "Delete your account?",
      status: "danger",
      trigger: "Delete Account",
    },
  ] as const;

  return (
    <div className="flex flex-wrap gap-4">
      {examples.map(({actions, body, classNames, header, status, trigger}) => (
        <AlertDialog key={status}>
          <Button className={classNames}>{trigger}</Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status={status} />
                  <AlertDialog.Heading>{header}</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>{body}</p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    {actions.cancel}
                  </Button>
                  <Button slot="close" variant={status === "danger" ? "danger" : "primary"}>
                    {actions.confirm}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      ))}
    </div>
  );
}

```

### Placements

```tsx
"use client";

import {AlertDialog, Button} from "@heroui/react";

export function Placements() {
  const placements = ["auto", "top", "center", "bottom"] as const;

  return (
    <div className="flex flex-wrap gap-4">
      {placements.map((placement) => (
        <AlertDialog key={placement}>
          <Button variant="secondary">
            {placement.charAt(0).toUpperCase() + placement.slice(1)}
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container placement={placement}>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="accent" />
                  <AlertDialog.Heading>
                    {placement === "auto"
                      ? "Auto Placement"
                      : `${placement.charAt(0).toUpperCase() + placement.slice(1)} Position`}
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    {placement === "auto"
                      ? "Automatically positions at the bottom on mobile and center on desktop for optimal user experience."
                      : `This dialog is positioned at the ${placement} of the viewport. Critical confirmations are typically centered for maximum attention.`}
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    Cancel
                  </Button>
                  <Button slot="close">Confirm</Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      ))}
    </div>
  );
}

```

### Backdrop Variants

```tsx
"use client";

import {AlertDialog, Button} from "@heroui/react";

export function BackdropVariants() {
  const variants = ["opaque", "blur", "transparent"] as const;

  return (
    <div className="flex flex-wrap gap-4">
      {variants.map((variant) => (
        <AlertDialog key={variant}>
          <Button variant="secondary">{variant.charAt(0).toUpperCase() + variant.slice(1)}</Button>
          <AlertDialog.Backdrop variant={variant}>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="accent" />
                  <AlertDialog.Heading>
                    Backdrop: {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    {variant === "opaque"
                      ? "An opaque dark backdrop that completely obscures the background, providing maximum focus on the dialog."
                      : variant === "blur"
                        ? "A blurred backdrop that softly obscures the background while maintaining visual context."
                        : "A transparent backdrop that keeps the background fully visible, useful for less critical confirmations."}
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    Cancel
                  </Button>
                  <Button slot="close">Confirm</Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      ))}
    </div>
  );
}

```

### Sizes

```tsx
"use client";

import {Rocket} from "@gravity-ui/icons";
import {AlertDialog, Button} from "@heroui/react";

export function Sizes() {
  const sizes = ["xs", "sm", "md", "lg", "cover"] as const;

  return (
    <div className="flex flex-wrap gap-4">
      {sizes.map((size) => (
        <AlertDialog key={size}>
          <Button variant="secondary">{size.charAt(0).toUpperCase() + size.slice(1)}</Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container size={size}>
              <AlertDialog.Dialog>
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon className="bg-default text-foreground">
                    <Rocket className="size-5" />
                  </AlertDialog.Icon>
                  <AlertDialog.Heading>
                    Size: {size.charAt(0).toUpperCase() + size.slice(1)}
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    {size === "cover" ? (
                      <>
                        This alert dialog uses the <code>cover</code> size variant. It spans the
                        full screen with margins: 16px on mobile and 40px on desktop. Maintains
                        rounded corners and standard padding. Perfect for critical confirmations
                        that need maximum width while preserving alert dialog aesthetics.
                      </>
                    ) : (
                      <>
                        This alert dialog uses the <code>{size}</code> size variant. On mobile
                        devices, all sizes adapt to near full-width for optimal viewing. On desktop,
                        each size provides a different maximum width to suit various content needs.
                      </>
                    )}
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    Cancel
                  </Button>
                  <Button slot="close">Confirm</Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      ))}
    </div>
  );
}

```

### Custom Icon

```tsx
"use client";

import {LockOpen} from "@gravity-ui/icons";
import {AlertDialog, Button} from "@heroui/react";

export function CustomIcon() {
  return (
    <AlertDialog>
      <Button variant="secondary">Reset Password</Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning">
                <LockOpen className="size-5" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>Reset your password?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                We'll send a password reset link to your email address. You'll need to create a new
                password to regain access to your account.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button slot="close">Send Reset Link</Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

```

### Custom Backdrop

```tsx
"use client";

import {TriangleExclamation} from "@gravity-ui/icons";
import {AlertDialog, Button} from "@heroui/react";

export function CustomBackdrop() {
  return (
    <AlertDialog>
      <Button variant="danger">Delete Account</Button>
      <AlertDialog.Backdrop
        className="bg-linear-to-t from-red-950/90 via-red-950/50 to-transparent dark:from-red-950/95 dark:via-red-950/60"
        variant="blur"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header className="items-center text-center">
              <AlertDialog.Icon status="danger">
                <TriangleExclamation className="size-5" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>Permanently delete your account?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                This action cannot be undone. All your data, settings, and content will be
                permanently removed from our servers. The dramatic red backdrop emphasizes the
                severity and irreversibility of this decision.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer className="flex-col-reverse">
              <Button className="w-full" slot="close">
                Keep Account
              </Button>
              <Button className="w-full" slot="close" variant="danger">
                Delete Forever
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

```

### Dismiss Behavior

```tsx
"use client";

import {CircleInfo} from "@gravity-ui/icons";
import {AlertDialog, Button} from "@heroui/react";

export function DismissBehavior() {
  return (
    <div className="flex max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">isDismissable</h3>
        <p className="text-sm text-muted">
          Controls whether the alert dialog can be dismissed by clicking the overlay backdrop. Alert
          dialogs typically require explicit action, so this defaults to <code>false</code>. Set to{" "}
          <code>true</code> for less critical confirmations.
        </p>
        <AlertDialog>
          <Button variant="secondary">Open Alert Dialog</Button>
          <AlertDialog.Backdrop isDismissable={false}>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger">
                    <CircleInfo className="size-5" />
                  </AlertDialog.Icon>
                  <AlertDialog.Heading>isDismissable = false</AlertDialog.Heading>
                  <p className="text-sm leading-5 text-muted">
                    Clicking the backdrop won't close this alert dialog
                  </p>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    Try clicking outside this alert dialog on the overlay - it won't close. You must
                    use the action buttons to dismiss it.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    Cancel
                  </Button>
                  <Button slot="close">Confirm</Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">isKeyboardDismissDisabled</h3>
        <p className="text-sm text-muted">
          Controls whether the ESC key can dismiss the alert dialog. Alert dialogs typically require
          explicit action, so this defaults to <code>true</code>. When set to <code>false</code>,
          the ESC key will be enabled.
        </p>
        <AlertDialog>
          <Button variant="secondary">Open Alert Dialog</Button>
          <AlertDialog.Backdrop isKeyboardDismissDisabled>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="accent">
                    <CircleInfo className="size-5" />
                  </AlertDialog.Icon>
                  <AlertDialog.Heading>isKeyboardDismissDisabled = true</AlertDialog.Heading>
                  <p className="text-sm leading-5 text-muted">ESC key is disabled</p>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    Press ESC - nothing happens. You must use the action buttons to dismiss this
                    alert dialog.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    Cancel
                  </Button>
                  <Button slot="close">Confirm</Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>
    </div>
  );
}

```

### Close Methods

```tsx
"use client";

import {AlertDialog, Button} from "@heroui/react";

export function CloseMethods() {
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Using slot="close"</h3>
        <p className="text-sm text-muted">
          The simplest way to close a dialog. Add <code>slot="close"</code> to any Button component
          within the dialog. When clicked, it will automatically close the dialog.
        </p>
        <AlertDialog>
          <Button variant="secondary">Open Dialog</Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.Header>
                  <AlertDialog.Icon status="accent" />
                  <AlertDialog.Heading>Using slot="close"</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    Click either button below - both have <code>slot="close"</code> and will close
                    the dialog automatically.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    Cancel
                  </Button>
                  <Button slot="close">Confirm</Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Using Dialog render props</h3>
        <p className="text-sm text-muted">
          Access the <code>close</code> method from the Dialog's render props. This gives you full
          control over when and how to close the dialog, allowing you to add custom logic before
          closing.
        </p>
        <AlertDialog>
          <Button variant="secondary">Open Dialog</Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                {(renderProps) => (
                  <>
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="success" />
                      <AlertDialog.Heading>Using Dialog render props</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <p>
                        The buttons below use the <code>close</code> method from render props. You
                        can add validation or other logic before calling{" "}
                        <code>renderProps.close()</code>.
                      </p>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button variant="tertiary" onPress={() => renderProps.close()}>
                        Cancel
                      </Button>
                      <Button onPress={() => renderProps.close()}>Confirm</Button>
                    </AlertDialog.Footer>
                  </>
                )}
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>
    </div>
  );
}

```

### Controlled State

```tsx
"use client";

import {AlertDialog, Button, useOverlayState} from "@heroui/react";
import React from "react";

export function Controlled() {
  const [isOpen, setIsOpen] = React.useState(false);

  const state = useOverlayState();

  return (
    <div className="flex max-w-md flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-foreground">With React.useState()</h3>
        <p className="text-sm leading-relaxed text-pretty text-muted">
          Control the alert dialog using React's <code className="text-foreground">useState</code>{" "}
          hook for simple state management. Perfect for basic use cases.
        </p>
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex w-full items-center justify-between">
            <p className="text-xs text-muted">
              Status:{" "}
              <span className="font-mono font-medium text-foreground">
                {isOpen ? "open" : "closed"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onPress={() => setIsOpen(true)}>
              Open Dialog
            </Button>
            <Button size="sm" variant="tertiary" onPress={() => setIsOpen(!isOpen)}>
              Toggle
            </Button>
          </div>
        </div>

        <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="accent" />
                <AlertDialog.Heading>Controlled with useState()</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  This alert dialog is controlled by React's <code>useState</code> hook. Pass{" "}
                  <code>isOpen</code> and <code>onOpenChange</code> props to manage the dialog state
                  externally.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="tertiary">
                  Cancel
                </Button>
                <Button slot="close">Confirm</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-foreground">With useOverlayState()</h3>
        <p className="text-sm leading-relaxed text-pretty text-muted">
          Use the <code className="text-foreground">useOverlayState</code> hook for a cleaner API
          with convenient methods like <code>open()</code>, <code>close()</code>, and{" "}
          <code>toggle()</code>.
        </p>
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex w-full items-center justify-between">
            <p className="text-xs text-muted">
              Status:{" "}
              <span className="font-mono font-medium text-foreground">
                {state.isOpen ? "open" : "closed"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onPress={state.open}>
              Open Dialog
            </Button>
            <Button size="sm" variant="tertiary" onPress={state.toggle}>
              Toggle
            </Button>
          </div>
        </div>

        <AlertDialog.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="success" />
                <AlertDialog.Heading>Controlled with useOverlayState()</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  The <code>useOverlayState</code> hook provides dedicated methods for common
                  operations. No need to manually create callbacks—just use{" "}
                  <code>state.open()</code>, <code>state.close()</code>, or{" "}
                  <code>state.toggle()</code>.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="tertiary">
                  Cancel
                </Button>
                <Button slot="close">Confirm</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </div>
    </div>
  );
}

```

### Custom Trigger

```tsx
"use client";

import {TrashBin} from "@gravity-ui/icons";
import {AlertDialog, Button} from "@heroui/react";

export function CustomTrigger() {
  return (
    <AlertDialog>
      <AlertDialog.Trigger className="group flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-xs select-none hover:bg-surface-secondary">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger-soft-foreground">
          <TrashBin className="size-6" />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold">Delete Item</p>
          <p className="text-xs text-muted">Permanently remove this item</p>
        </div>
      </AlertDialog.Trigger>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <TrashBin className="size-5" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>Delete this item?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                Use <code>AlertDialog.Trigger</code> to create custom trigger elements beyond
                standard buttons. This example shows a card-style trigger with icons and descriptive
                text.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button slot="close" variant="danger">
                Delete Item
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

```

### Custom Animations

```tsx
"use client";

import {ArrowUpFromLine, Sparkles} from "@gravity-ui/icons";
import {AlertDialog, Button} from "@heroui/react";
import React from "react";

const iconMap: Record<string, React.ComponentType<{className?: string}>> = {
  "gravity-ui:arrow-up-from-line": ArrowUpFromLine,
  "gravity-ui:sparkles": Sparkles,
};

export function CustomAnimations() {
  const animations = [
    {
      classNames: {
        backdrop: [
          "data-[entering]:duration-400",
          "data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)]",
          "data-[exiting]:duration-200",
          "data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]",
        ].join(" "),
        container: [
          "data-[entering]:animate-in",
          "data-[entering]:fade-in-0",
          "data-[entering]:zoom-in-95",
          "data-[entering]:duration-400",
          "data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)]",
          "data-[exiting]:animate-out",
          "data-[exiting]:fade-out-0",
          "data-[exiting]:zoom-out-95",
          "data-[exiting]:duration-200",
          "data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]",
        ].join(" "),
      },
      description:
        "Physics-based elastic scaling. Simulates a high-damping spring system with fast transient response and prolonged settling time. Ideal for Alert Dialogs and Modals.",
      icon: "gravity-ui:sparkles",
      name: "Kinematic Scale",
    },
    {
      classNames: {
        backdrop: [
          "data-[entering]:duration-500",
          "data-[entering]:ease-[cubic-bezier(0.25,1,0.5,1)]",
          "data-[exiting]:duration-200",
          "data-[exiting]:ease-[cubic-bezier(0.5,0,0.75,0)]",
        ].join(" "),
        container: [
          "data-[entering]:animate-in",
          "data-[entering]:fade-in-0",
          "data-[entering]:slide-in-from-bottom-4",
          "data-[entering]:duration-500",
          "data-[entering]:ease-[cubic-bezier(0.25,1,0.5,1)]",
          "data-[exiting]:animate-out",
          "data-[exiting]:fade-out-0",
          "data-[exiting]:slide-out-to-bottom-2",
          "data-[exiting]:duration-200",
          "data-[exiting]:ease-[cubic-bezier(0.5,0,0.75,0)]",
        ].join(" "),
      },
      description:
        "Simulates movement through a medium with fluid resistance. Eliminates mechanical linearity for a natural, grounded feel. Perfect for Bottom Sheets or Toasts.",
      icon: "gravity-ui:arrow-up-from-line",
      name: "Fluid Slide",
    },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {animations.map(({classNames, description, icon, name}) => {
        const IconComponent = iconMap[icon];

        return (
          <AlertDialog key={name}>
            <Button variant="secondary">{name}</Button>
            <AlertDialog.Backdrop className={classNames.backdrop}>
              <AlertDialog.Container className={classNames.container}>
                <AlertDialog.Dialog className="sm:max-w-[400px]">
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="accent">
                      {!!IconComponent && <IconComponent className="size-5" />}
                    </AlertDialog.Icon>
                    <AlertDialog.Heading>{name} Animation</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="mt-1">{description}</p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      Close
                    </Button>
                    <Button slot="close">Try Again</Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        );
      })}
    </div>
  );
}

```

### Custom Portal

```tsx
"use client";

import {AlertDialog, Button} from "@heroui/react";
import {useCallback, useRef, useState} from "react";

export function CustomPortal() {
  const portalRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const setPortalRef = useCallback((node: HTMLDivElement | null) => {
    portalRef.current = node;
    setPortalContainer(node);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm">
          Render alert dialogs inside a custom container instead of <code>document.body</code>
        </p>
        <p className="text-sm text-muted">
          Apply <code className="rounded px-1 py-0.5 text-xs">transform: translateZ(0)</code> to the
          container to create a new stacking context.
        </p>
      </div>
      <div
        ref={setPortalRef}
        className="relative flex h-[380px] items-center justify-center overflow-hidden rounded bg-muted/20"
        // new stacking context
        style={{transform: "translate(0)"}}
      >
        {!!portalContainer && (
          <AlertDialog>
            <Button>Open Alert Dialog</Button>
            <AlertDialog.Backdrop className="h-full" UNSTABLE_portalContainer={portalContainer}>
              <AlertDialog.Container className="h-full max-h-full">
                <AlertDialog.Dialog className="h-full max-h-full sm:max-w-md">
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="accent" />
                    <AlertDialog.Heading>Custom Portal</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                      incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
                      nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>
                    <p className="text-sm text-muted">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                      incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
                      nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>
                    <p className="text-sm text-muted">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                      incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
                      nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      Cancel
                    </Button>
                    <Button slot="close">Confirm</Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

```

## Related Components

- **Button**: Allows a user to perform an action
- **CloseButton**: Button for dismissing overlays

## Styling

### Passing Tailwind CSS classes

```tsx
import {AlertDialog, Button} from "@heroui/react";

function CustomAlertDialog() {
  return (
    <AlertDialog>
      <Button variant="danger">Delete</Button>
      <AlertDialog.Backdrop className="bg-red-950/90">
        <AlertDialog.Container className="items-start pt-20">
          <AlertDialog.Dialog className="border-2 border-red-500 sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Custom Styled Alert</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>This alert dialog has custom styling applied via Tailwind classes</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button slot="close" variant="danger">
                Delete
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

```

### Customizing the component classes

To customize the AlertDialog component classes, you can use the `@layer components` directive.

<br />
[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .alert-dialog__backdrop {
    @apply bg-gradient-to-br from-black/60 to-black/80;
  }

  .alert-dialog__dialog {
    @apply rounded-2xl border border-red-500/20 shadow-2xl;
  }

  .alert-dialog__header {
    @apply gap-4;
  }

  .alert-dialog__icon {
    @apply size-16;
  }

  .alert-dialog__close-trigger {
    @apply rounded-full bg-white/10 hover:bg-white/20;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The AlertDialog component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/alert-dialog.css)):

#### Base Classes

- `.alert-dialog__trigger` - Trigger element that opens the alert dialog
- `.alert-dialog__backdrop` - Overlay backdrop behind the dialog
- `.alert-dialog__container` - Positioning wrapper with placement support
- `.alert-dialog__dialog` - Dialog content container
- `.alert-dialog__header` - Header section for icon and title
- `.alert-dialog__heading` - Heading text styles
- `.alert-dialog__body` - Main content area
- `.alert-dialog__footer` - Footer section for actions
- `.alert-dialog__icon` - Icon container with status colors
- `.alert-dialog__close-trigger` - Close button element

#### Backdrop Variants

- `.alert-dialog__backdrop--opaque` - Opaque colored backdrop (default)
- `.alert-dialog__backdrop--blur` - Blurred backdrop with glass effect
- `.alert-dialog__backdrop--transparent` - Transparent backdrop (no overlay)

#### Status Variants (Icon)

- `.alert-dialog__icon--default` - Default gray status
- `.alert-dialog__icon--accent` - Accent blue status
- `.alert-dialog__icon--success` - Success green status
- `.alert-dialog__icon--warning` - Warning orange status
- `.alert-dialog__icon--danger` - Danger red status

### Interactive States

The component supports these interactive states:

- **Focus**: `:focus-visible` or `[data-focus-visible="true"]` - Applied to trigger, dialog, and close button
- **Hover**: `:hover` or `[data-hovered="true"]` - Applied to close button on hover
- **Active**: `:active` or `[data-pressed="true"]` - Applied to close button when pressed
- **Entering**: `[data-entering]` - Applied during dialog opening animation
- **Exiting**: `[data-exiting]` - Applied during dialog closing animation
- **Placement**: `[data-placement="*"]` - Applied based on dialog position (auto, top, center, bottom)

## API Reference

### AlertDialog

| Prop       | Type        | Default | Description                    |
| ---------- | ----------- | ------- | ------------------------------ |
| `children` | `ReactNode` | -       | Trigger and container elements |

### AlertDialog.Trigger

| Prop        | Type        | Default | Description            |
| ----------- | ----------- | ------- | ---------------------- |
| `children`  | `ReactNode` | -       | Custom trigger content |
| `className` | `string`    | -       | CSS classes            |

### AlertDialog.Backdrop

| Prop                        | Type                                      | Default    | Description               |
| --------------------------- | ----------------------------------------- | ---------- | ------------------------- |
| `variant`                   | `"opaque" \| "blur" \| "transparent"`     | `"opaque"` | Backdrop overlay style    |
| `isDismissable`             | `boolean`                                 | `false`    | Close on backdrop click   |
| `isKeyboardDismissDisabled` | `boolean`                                 | `true`     | Disable ESC key to close  |
| `isOpen`                    | `boolean`                                 | -          | Controlled open state     |
| `onOpenChange`              | `(isOpen: boolean) => void`               | -          | Open state change handler |
| `className`                 | `string \| (values) => string`            | -          | Backdrop CSS classes      |
| `UNSTABLE_portalContainer`  | `HTMLElement`                             | -          | Custom portal container   |

### AlertDialog.Container

| Prop        | Type                                      | Default  | Description               |
| ----------- | ----------------------------------------- | -------- | ------------------------- |
| `placement` | `"auto" \| "center" \| "top" \| "bottom"` | `"auto"` | Dialog position on screen |
| `size`      | `"xs" \| "sm" \| "md" \| "lg" \| "cover"` | `"md"`   | Alert Dialog size variant |
| `className` | `string \| (values) => string`            | -        | Container CSS classes     |

### AlertDialog.Dialog

| Prop               | Type                                  | Default         | Description                |
| ------------------ | ------------------------------------- | --------------- | -------------------------- |
| `children`         | `ReactNode \| ({close}) => ReactNode` | -               | Content or render function |
| `className`        | `string`                              | -               | CSS classes                |
| `role`             | `string`                              | `"alertdialog"` | ARIA role                  |
| `aria-label`       | `string`                              | -               | Accessibility label        |
| `aria-labelledby`  | `string`                              | -               | ID of label element        |
| `aria-describedby` | `string`                              | -               | ID of description element  |

### AlertDialog.Header

| Prop        | Type        | Default | Description                                 |
| ----------- | ----------- | ------- | ------------------------------------------- |
| `children`  | `ReactNode` | -       | Header content (typically Icon and Heading) |
| `className` | `string`    | -       | CSS classes                                 |

### AlertDialog.Heading

| Prop        | Type        | Default | Description  |
| ----------- | ----------- | ------- | ------------ |
| `children`  | `ReactNode` | -       | Heading text |
| `className` | `string`    | -       | CSS classes  |

### AlertDialog.Body

| Prop        | Type        | Default | Description  |
| ----------- | ----------- | ------- | ------------ |
| `children`  | `ReactNode` | -       | Body content |
| `className` | `string`    | -       | CSS classes  |

### AlertDialog.Footer

| Prop        | Type        | Default | Description                               |
| ----------- | ----------- | ------- | ----------------------------------------- |
| `children`  | `ReactNode` | -       | Footer content (typically action buttons) |
| `className` | `string`    | -       | CSS classes                               |

### AlertDialog.Icon

| Prop        | Type                                                          | Default    | Description          |
| ----------- | ------------------------------------------------------------- | ---------- | -------------------- |
| `children`  | `ReactNode`                                                   | -          | Custom icon element  |
| `status`    | `"default" \| "accent" \| "success" \| "warning" \| "danger"` | `"danger"` | Status color variant |
| `className` | `string`                                                      | -          | CSS classes          |

### AlertDialog.CloseTrigger

| Prop        | Type                           | Default | Description         |
| ----------- | ------------------------------ | ------- | ------------------- |
| `children`  | `ReactNode`                    | -       | Custom close button |
| `className` | `string \| (values) => string` | -       | CSS classes         |

### useOverlayState Hook

```tsx
import {useOverlayState} from "@heroui/react";

const state = useOverlayState({
  defaultOpen: false,
  onOpenChange: (isOpen) => console.log(isOpen),
});

state.isOpen; // Current state
state.open(); // Open dialog
state.close(); // Close dialog
state.toggle(); // Toggle state
state.setOpen(); // Set state directly

```

## Accessibility

Implements [WAI-ARIA AlertDialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/):

- **Focus trap**: Focus locked within alert dialog
- **Keyboard**: `ESC` closes (when enabled), `Tab` cycles elements
- **Screen readers**: Proper ARIA attributes with `role="alertdialog"`
- **Scroll lock**: Body scroll disabled when open
- **Required action**: Defaults to requiring explicit user action (no backdrop/ESC dismiss)
</page>

<page url="/en/docs/react/components/autocomplete">
# Autocomplete

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/autocomplete
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(pickers)/autocomplete.mdx
> An autocomplete combines a select with filtering, allowing users to search and select from a list of options


***

## Import

```tsx
import { Autocomplete, useFilter } from "@heroui/react";

```

### Usage

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export default function Default() {
  const {contains} = useFilter({sensitivity: "base"});

  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const items = [
    {id: "florida", name: "Florida"},
    {id: "delaware", name: "Delaware"},
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "new-york", name: "New York"},
    {id: "washington", name: "Washington"},
  ];

  const onRemoveTags = (keys: Set<Key>) => {
    setSelectedKeys((prev) => prev.filter((key) => !keys.has(key)));
  };

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Select states"
      selectionMode="multiple"
      value={selectedKeys}
      onChange={(keys: Key | Key[] | null) => setSelectedKeys(keys as Key[])}
    >
      <Label>States to Visit</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}: any) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            const selectedItemsKeys = state.selectedItems.map((item: any) => item.key);

            return (
              <TagGroup size="sm" onRemove={onRemoveTags}>
                <TagGroup.List>
                  {selectedItemsKeys.map((selectedItemKey: Key) => {
                    const item = items.find((s) => s.id === selectedItemKey);

                    if (!item) return null;

                    return (
                      <Tag key={item.id} id={item.id}>
                        {item.name}
                      </Tag>
                    );
                  })}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {items.map((item) => (
              <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                {item.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### Anatomy

Import the Autocomplete component and access all parts using dot notation.

```tsx
import {Autocomplete, Label, Description, SearchField, ListBox} from "@heroui/react";

export default () => (
  <Autocomplete>
    <Label />
    <Autocomplete.Trigger>
      <Autocomplete.Value />
      <Autocomplete.ClearButton />
      <Autocomplete.Indicator />
    </Autocomplete.Trigger>
    <Description />
    <Autocomplete.Popover>
      <Autocomplete.Filter>
        <SearchField>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input />
          </SearchField.Group>
        </SearchField>
        <ListBox>
          <ListBox.Item>
            <Label />
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </Autocomplete.Filter>
    </Autocomplete.Popover>
  </Autocomplete>
);

```

### With Description

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  Description,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function WithDescription() {
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const {contains} = useFilter({sensitivity: "base"});

  const items = [
    {id: "florida", name: "Florida"},
    {id: "delaware", name: "Delaware"},
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "new-york", name: "New York"},
    {id: "washington", name: "Washington"},
  ];

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Select one"
      selectionMode="single"
      value={selectedKey}
      onChange={setSelectedKey}
    >
      <Label>State</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search states..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {items.map((item) => (
              <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                {item.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
      <Description>Select your state of residence</Description>
    </Autocomplete>
  );
}

```

### Multiple Select

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function MultipleSelect() {
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const {contains} = useFilter({sensitivity: "base"});

  const items = [
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "florida", name: "Florida"},
    {id: "new-york", name: "New York"},
    {id: "illinois", name: "Illinois"},
    {id: "pennsylvania", name: "Pennsylvania"},
  ];

  const onRemoveTags = (keys: Set<Key>) => {
    setSelectedKeys((prev) => prev.filter((key) => !keys.has(key)));
  };

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Select states"
      selectionMode="multiple"
      value={selectedKeys}
      onChange={(keys) => setSelectedKeys(keys as Key[])}
    >
      <Label>States</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            const selectedItemsKeys = state.selectedItems.map((item) => item.key);

            return (
              <TagGroup size="sm" onRemove={onRemoveTags}>
                <TagGroup.List>
                  {selectedItemsKeys.map((selectedItemKey) => {
                    const item = items.find((s) => s.id === selectedItemKey);

                    if (!item) return null;

                    return (
                      <Tag key={item.id} id={item.id}>
                        {item.name}
                      </Tag>
                    );
                  })}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {items.map((item) => (
              <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                {item.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### With Sections

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  EmptyState,
  Header,
  Label,
  ListBox,
  SearchField,
  Separator,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function WithSections() {
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const {contains} = useFilter({sensitivity: "base"});

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Select a country"
      selectionMode="single"
      value={selectedKey}
      onChange={setSelectedKey}
    >
      <Label>Country</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search countries..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            <ListBox.Section>
              <Header>North America</Header>
              <ListBox.Item id="usa" textValue="United States">
                United States
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="canada" textValue="Canada">
                Canada
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="mexico" textValue="Mexico">
                Mexico
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox.Section>
            <Separator />
            <ListBox.Section>
              <Header>Europe</Header>
              <ListBox.Item id="uk" textValue="United Kingdom">
                United Kingdom
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="france" textValue="France">
                France
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="germany" textValue="Germany">
                Germany
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="spain" textValue="Spain">
                Spain
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="italy" textValue="Italy">
                Italy
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox.Section>
            <Separator />
            <ListBox.Section>
              <Header>Asia</Header>
              <ListBox.Item id="japan" textValue="Japan">
                Japan
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="china" textValue="China">
                China
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="india" textValue="India">
                India
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="south-korea" textValue="South Korea">
                South Korea
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox.Section>
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### With Disabled Options

```tsx
"use client";

import type {Key} from "@heroui/react";

import {Autocomplete, EmptyState, Label, ListBox, SearchField, useFilter} from "@heroui/react";
import {useState} from "react";

export function WithDisabledOptions() {
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const {contains} = useFilter({sensitivity: "base"});

  return (
    <Autocomplete
      className="w-[256px]"
      disabledKeys={["cat", "kangaroo"]}
      placeholder="Select an animal"
      selectionMode="single"
      value={selectedKey}
      onChange={setSelectedKey}
    >
      <Label>Animal</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search animals..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            <ListBox.Item id="dog" textValue="Dog">
              Dog
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="cat" textValue="Cat">
              Cat
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="bird" textValue="Bird">
              Bird
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="kangaroo" textValue="Kangaroo">
              Kangaroo
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="elephant" textValue="Elephant">
              Elephant
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="tiger" textValue="Tiger">
              Tiger
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### Allows Empty Collection

The `allowsEmptyCollection` prop enables the autocomplete to function even when there are no items in the collection. This is useful for scenarios where the list might be empty initially or when all items are filtered out.

```tsx
"use client";

import {Autocomplete, EmptyState, Label, ListBox, SearchField, useFilter} from "@heroui/react";

export function AllowsEmptyCollection() {
  const {contains} = useFilter({sensitivity: "base"});

  return (
    <Autocomplete
      allowsEmptyCollection
      className="w-[256px]"
      placeholder="Select one"
      selectionMode="single"
    >
      <Label>State</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search states..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>} />
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### Custom Indicator

```tsx
"use client";

import type {Key} from "@heroui/react";

import {Autocomplete, EmptyState, Label, ListBox, SearchField, useFilter} from "@heroui/react";
import {Icon} from "@iconify/react";
import {useState} from "react";

export function CustomIndicator() {
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const {contains} = useFilter({sensitivity: "base"});

  const items = [
    {id: "florida", name: "Florida"},
    {id: "delaware", name: "Delaware"},
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "new-york", name: "New York"},
    {id: "washington", name: "Washington"},
  ];

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Select one"
      selectionMode="single"
      value={selectedKey}
      onChange={setSelectedKey}
    >
      <Label>State</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator className="size-3">
          <Icon icon="gravity-ui:chevrons-expand-vertical" />
        </Autocomplete.Indicator>
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search states..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {items.map((item) => (
              <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                {item.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### Required

```tsx
"use client";

import {
  Autocomplete,
  Button,
  EmptyState,
  FieldError,
  Form,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";

export function Required() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};

    // Convert FormData to plain object
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    alert("Form submitted successfully!");
  };

  const {contains} = useFilter({sensitivity: "base"});

  const states = [
    {id: "florida", name: "Florida"},
    {id: "delaware", name: "Delaware"},
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "new-york", name: "New York"},
    {id: "washington", name: "Washington"},
  ];

  const countries = [
    {id: "usa", name: "United States"},
    {id: "canada", name: "Canada"},
    {id: "mexico", name: "Mexico"},
    {id: "uk", name: "United Kingdom"},
    {id: "france", name: "France"},
    {id: "germany", name: "Germany"},
  ];

  return (
    <Form className="flex w-[256px] flex-col gap-4" onSubmit={onSubmit}>
      <Autocomplete
        isRequired
        className="w-full"
        name="state"
        placeholder="Select one"
        selectionMode="single"
      >
        <Label>State</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search states..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
              {states.map((state) => (
                <ListBox.Item key={state.id} id={state.id} textValue={state.name}>
                  {state.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
        <FieldError />
      </Autocomplete>
      <Autocomplete
        isRequired
        className="w-full"
        name="country"
        placeholder="Select a country"
        selectionMode="single"
      >
        <Label>Country</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search countries..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
              {countries.map((country) => (
                <ListBox.Item key={country.id} id={country.id} textValue={country.name}>
                  {country.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
        <FieldError />
      </Autocomplete>
      <Button type="submit">Submit</Button>
    </Form>
  );
}

```

### Full Width

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Surface,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function FullWidth() {
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const {contains} = useFilter({sensitivity: "base"});

  const items = [
    {id: "florida", name: "Florida"},
    {id: "delaware", name: "Delaware"},
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "new-york", name: "New York"},
    {id: "washington", name: "Washington"},
  ];

  return (
    <Surface className="w-[380px] space-y-4 rounded-3xl p-6">
      <Autocomplete
        fullWidth
        placeholder="Select one"
        selectionMode="single"
        value={selectedKey}
        variant="secondary"
        onChange={setSelectedKey}
      >
        <Label>State</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search states..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
              {items.map((item) => (
                <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                  {item.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Surface>
  );
}

```

### Variants

The Autocomplete component supports two visual variants:

- **`primary`** (default) - Standard styling with shadow, suitable for most use cases
- **`secondary`** - Lower emphasis variant without shadow, suitable for use in Surface components

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function Variants() {
  const [selectedKey1, setSelectedKey1] = useState<Key | null>(null);
  const [selectedKey2, setSelectedKey2] = useState<Key | null>(null);
  const [selectedKeys1, setSelectedKeys1] = useState<Key[]>([]);
  const [selectedKeys2, setSelectedKeys2] = useState<Key[]>([]);
  const {contains} = useFilter({sensitivity: "base"});

  const items = [
    {id: "option1", name: "Option 1"},
    {id: "option2", name: "Option 2"},
    {id: "option3", name: "Option 3"},
    {id: "option4", name: "Option 4"},
  ];

  const onRemoveTags1 = (keys: Set<Key>) => {
    setSelectedKeys1((prev) => prev.filter((key) => !keys.has(key)));
  };

  const onRemoveTags2 = (keys: Set<Key>) => {
    setSelectedKeys2((prev) => prev.filter((key) => !keys.has(key)));
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Single Select Variants</h3>
        <div className="flex flex-col gap-4">
          <Autocomplete
            className="w-[256px]"
            placeholder="Select one"
            selectionMode="single"
            value={selectedKey1}
            variant="primary"
            onChange={setSelectedKey1}
          >
            <Label>Primary variant</Label>
            <Autocomplete.Trigger>
              <Autocomplete.Value />
              <Autocomplete.ClearButton />
              <Autocomplete.Indicator />
            </Autocomplete.Trigger>
            <Autocomplete.Popover>
              <Autocomplete.Filter filter={contains}>
                <SearchField autoFocus name="search" variant="secondary">
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Search..." />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
                  {items.map((item) => (
                    <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                      {item.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Autocomplete.Filter>
            </Autocomplete.Popover>
          </Autocomplete>
          <Autocomplete
            className="w-[256px]"
            placeholder="Select one"
            selectionMode="single"
            value={selectedKey2}
            variant="secondary"
            onChange={setSelectedKey2}
          >
            <Label>Secondary variant</Label>
            <Autocomplete.Trigger>
              <Autocomplete.Value />
              <Autocomplete.ClearButton />
              <Autocomplete.Indicator />
            </Autocomplete.Trigger>
            <Autocomplete.Popover>
              <Autocomplete.Filter filter={contains}>
                <SearchField autoFocus name="search" variant="secondary">
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Search..." />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
                  {items.map((item) => (
                    <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                      {item.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Autocomplete.Filter>
            </Autocomplete.Popover>
          </Autocomplete>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Multiple Select Variants</h3>
        <div className="flex flex-col gap-4">
          <Autocomplete
            className="w-[256px]"
            placeholder="Select multiple"
            selectionMode="multiple"
            value={selectedKeys1}
            variant="primary"
            onChange={(keys) => setSelectedKeys1(keys as Key[])}
          >
            <Label>Primary variant</Label>
            <Autocomplete.Trigger>
              <Autocomplete.Value>
                {({defaultChildren, isPlaceholder, state}) => {
                  if (isPlaceholder || state.selectedItems.length === 0) {
                    return defaultChildren;
                  }

                  const selectedItemsKeys = state.selectedItems.map((item) => item.key);

                  return (
                    <TagGroup size="sm" onRemove={onRemoveTags1}>
                      <TagGroup.List>
                        {selectedItemsKeys.map((selectedItemKey) => {
                          const item = items.find((s) => s.id === selectedItemKey);

                          if (!item) return null;

                          return (
                            <Tag key={item.id} id={item.id}>
                              {item.name}
                            </Tag>
                          );
                        })}
                      </TagGroup.List>
                    </TagGroup>
                  );
                }}
              </Autocomplete.Value>
              <Autocomplete.ClearButton />
              <Autocomplete.Indicator />
            </Autocomplete.Trigger>
            <Autocomplete.Popover>
              <Autocomplete.Filter filter={contains}>
                <SearchField autoFocus name="search" variant="secondary">
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Search..." />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
                  {items.map((item) => (
                    <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                      {item.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Autocomplete.Filter>
            </Autocomplete.Popover>
          </Autocomplete>
          <Autocomplete
            className="w-[256px]"
            placeholder="Select multiple"
            selectionMode="multiple"
            value={selectedKeys2}
            variant="secondary"
            onChange={(keys) => setSelectedKeys2(keys as Key[])}
          >
            <Label>Secondary variant</Label>
            <Autocomplete.Trigger>
              <Autocomplete.Value>
                {({defaultChildren, isPlaceholder, state}) => {
                  if (isPlaceholder || state.selectedItems.length === 0) {
                    return defaultChildren;
                  }

                  const selectedItemsKeys = state.selectedItems.map((item) => item.key);

                  return (
                    <TagGroup size="sm" variant="surface" onRemove={onRemoveTags2}>
                      <TagGroup.List>
                        {selectedItemsKeys.map((selectedItemKey) => {
                          const item = items.find((s) => s.id === selectedItemKey);

                          if (!item) return null;

                          return (
                            <Tag key={item.id} id={item.id}>
                              {item.name}
                            </Tag>
                          );
                        })}
                      </TagGroup.List>
                    </TagGroup>
                  );
                }}
              </Autocomplete.Value>
              <Autocomplete.ClearButton />
              <Autocomplete.Indicator />
            </Autocomplete.Trigger>
            <Autocomplete.Popover>
              <Autocomplete.Filter filter={contains}>
                <SearchField autoFocus name="search" variant="secondary">
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Search..." />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
                  {items.map((item) => (
                    <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                      {item.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Autocomplete.Filter>
            </Autocomplete.Popover>
          </Autocomplete>
        </div>
      </div>
    </div>
  );
}

```

### In Surface

When used inside a [Surface](/docs/components/surface) component, use `variant="secondary"` to apply the lower emphasis variant suitable for surface backgrounds.

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Surface,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function FullWidth() {
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const {contains} = useFilter({sensitivity: "base"});

  const items = [
    {id: "florida", name: "Florida"},
    {id: "delaware", name: "Delaware"},
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "new-york", name: "New York"},
    {id: "washington", name: "Washington"},
  ];

  return (
    <Surface className="w-[380px] space-y-4 rounded-3xl p-6">
      <Autocomplete
        fullWidth
        placeholder="Select one"
        selectionMode="single"
        value={selectedKey}
        variant="secondary"
        onChange={setSelectedKey}
      >
        <Label>State</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search states..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
              {items.map((item) => (
                <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                  {item.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Surface>
  );
}

```

### Custom Value

You can customize the displayed value using render props:

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Description,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function UserSelection() {
  const users = [
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg",
      email: "bob@heroui.com",
      fallback: "B",
      id: "1",
      name: "Bob",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg",
      email: "fred@heroui.com",
      fallback: "F",
      id: "2",
      name: "Fred",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg",
      email: "martha@heroui.com",
      fallback: "M",
      id: "3",
      name: "Martha",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg",
      email: "john@heroui.com",
      fallback: "J",
      id: "4",
      name: "John",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg",
      email: "jane@heroui.com",
      fallback: "J",
      id: "5",
      name: "Jane",
    },
  ];

  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const {contains} = useFilter({sensitivity: "base"});

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Select a user"
      selectionMode="single"
      value={selectedKey}
      onChange={setSelectedKey}
    >
      <Label>User</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            const selectedItems = state.selectedItems;

            if (selectedItems.length > 1) {
              return `${selectedItems.length} users selected`;
            }

            const selectedItem = users.find((user) => user.id === selectedItems[0]?.key);

            if (!selectedItem) {
              return defaultChildren;
            }

            return (
              <div className="flex items-center gap-2">
                <Avatar className="size-4" size="sm">
                  <AvatarImage src={selectedItem.avatarUrl} />
                  <AvatarFallback>{selectedItem.fallback}</AvatarFallback>
                </Avatar>
                <span>{selectedItem.name}</span>
              </div>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search users..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {users.map((user) => (
              <ListBox.Item key={user.id} id={user.id} textValue={user.name}>
                <Avatar size="sm">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.fallback}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <Label>{user.name}</Label>
                  <Description>{user.email}</Description>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### Controlled

```tsx
"use client";

import type {Key} from "@heroui/react";

import {Autocomplete, EmptyState, Label, ListBox, SearchField, useFilter} from "@heroui/react";
import {useState} from "react";

export function Controlled() {
  const states = [
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "florida", name: "Florida"},
    {id: "new-york", name: "New York"},
    {id: "illinois", name: "Illinois"},
    {id: "pennsylvania", name: "Pennsylvania"},
  ];

  const [state, setState] = useState<Key | null>("california");
  const {contains} = useFilter({sensitivity: "base"});

  const selectedState = states.find((s) => s.id === state);

  return (
    <div className="space-y-2">
      <Autocomplete
        className="w-[256px]"
        placeholder="Select a state"
        selectionMode="single"
        value={state}
        onChange={setState}
      >
        <Label>State (controlled)</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search states..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
              {states.map((state) => (
                <ListBox.Item key={state.id} id={state.id} textValue={state.name}>
                  {state.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
      <p className="text-sm text-muted">Selected: {selectedState?.name || "None"}</p>
    </div>
  );
}

```

### Controlled Multiple

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function MultipleSelect() {
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const {contains} = useFilter({sensitivity: "base"});

  const items = [
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "florida", name: "Florida"},
    {id: "new-york", name: "New York"},
    {id: "illinois", name: "Illinois"},
    {id: "pennsylvania", name: "Pennsylvania"},
  ];

  const onRemoveTags = (keys: Set<Key>) => {
    setSelectedKeys((prev) => prev.filter((key) => !keys.has(key)));
  };

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Select states"
      selectionMode="multiple"
      value={selectedKeys}
      onChange={(keys) => setSelectedKeys(keys as Key[])}
    >
      <Label>States</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            const selectedItemsKeys = state.selectedItems.map((item) => item.key);

            return (
              <TagGroup size="sm" onRemove={onRemoveTags}>
                <TagGroup.List>
                  {selectedItemsKeys.map((selectedItemKey) => {
                    const item = items.find((s) => s.id === selectedItemKey);

                    if (!item) return null;

                    return (
                      <Tag key={item.id} id={item.id}>
                        {item.name}
                      </Tag>
                    );
                  })}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {items.map((item) => (
              <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                {item.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### Controlled Open State

```tsx
"use client";

import {
  Autocomplete,
  Button,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function ControlledOpenState() {
  const [isOpen, setIsOpen] = useState(false);
  const {contains} = useFilter({sensitivity: "base"});

  const items = [
    {id: "florida", name: "Florida"},
    {id: "delaware", name: "Delaware"},
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "new-york", name: "New York"},
    {id: "washington", name: "Washington"},
  ];

  return (
    <div className="space-y-4">
      <Autocomplete
        className="w-[256px]"
        isOpen={isOpen}
        placeholder="Select one"
        selectionMode="single"
        onOpenChange={setIsOpen}
      >
        <Label>State</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search states..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
              {items.map((item) => (
                <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                  {item.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
      <Button onPress={() => setIsOpen(!isOpen)}>{isOpen ? "Close" : "Open"} Autocomplete</Button>
      <p className="text-sm text-muted">Autocomplete is {isOpen ? "open" : "closed"}</p>
    </div>
  );
}

```

### Asynchronous Filtering

```tsx
"use client";

import {Autocomplete, EmptyState, Label, ListBox, SearchField, Spinner} from "@heroui/react";
import {useAsyncList} from "@react-stately/data";
import {cn} from "tailwind-variants";

interface Character {
  name: string;
}

export function AsynchronousFiltering() {
  const list = useAsyncList<Character>({
    async load({filterText, signal}) {
      const res = await fetch(`https://swapi.py4e.com/api/people/?search=${filterText}`, {
        signal,
      });

      const json = await res.json();

      return {
        items: json.results,
      };
    },
  });

  return (
    <Autocomplete
      allowsEmptyCollection
      className="w-[256px]"
      placeholder="Search..."
      selectionMode="single"
    >
      <Label>Search a Star Wars characters</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter inputValue={list.filterText} onInputChange={list.setFilterText}>
          <SearchField autoFocus className="sticky top-0 z-10" name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search characters..." />
              <Spinner
                size="sm"
                className={cn("absolute top-1/2 right-2 -translate-y-1/2", {
                  "pointer-events-none opacity-0": !list.isLoading,
                })}
              />
              <SearchField.ClearButton
                className={cn({"pointer-events-none opacity-0": !!list.isLoading})}
              />
            </SearchField.Group>
          </SearchField>
          <ListBox
            className="max-h-[420px] overflow-y-auto"
            items={list.items}
            renderEmptyState={() => <EmptyState>No results found</EmptyState>}
          >
            {(item: Character) => (
              <ListBox.Item id={item.name} textValue={item.name}>
                {item.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### Disabled

```tsx
"use client";

import {Autocomplete, EmptyState, Label, ListBox, SearchField, useFilter} from "@heroui/react";

export function Disabled() {
  const {contains} = useFilter({sensitivity: "base"});

  const items = [
    {id: "florida", name: "Florida"},
    {id: "delaware", name: "Delaware"},
    {id: "california", name: "California"},
    {id: "texas", name: "Texas"},
    {id: "new-york", name: "New York"},
    {id: "washington", name: "Washington"},
  ];

  const countries = [
    {id: "argentina", name: "Argentina"},
    {id: "venezuela", name: "Venezuela"},
    {id: "japan", name: "Japan"},
    {id: "france", name: "France"},
    {id: "italy", name: "Italy"},
    {id: "spain", name: "Spain"},
  ];

  return (
    <div className="flex flex-col gap-4">
      <Autocomplete
        isDisabled
        className="w-[256px]"
        defaultValue="california"
        placeholder="Select one"
        selectionMode="single"
      >
        <Label>State</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search states..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
              {items.map((item) => (
                <ListBox.Item key={item.id} id={item.id} textValue={item.name}>
                  {item.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
      <Autocomplete
        isDisabled
        className="w-[256px]"
        defaultValue={["argentina", "japan", "france"]}
        placeholder="Select countries"
        selectionMode="multiple"
      >
        <Label>Countries to Visit</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search countries..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
              {countries.map((country) => (
                <ListBox.Item key={country.id} id={country.id} textValue={country.name}>
                  {country.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </div>
  );
}

```

### Advanced Examples

#### User Selection

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Description,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function UserSelection() {
  const users = [
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg",
      email: "bob@heroui.com",
      fallback: "B",
      id: "1",
      name: "Bob",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg",
      email: "fred@heroui.com",
      fallback: "F",
      id: "2",
      name: "Fred",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg",
      email: "martha@heroui.com",
      fallback: "M",
      id: "3",
      name: "Martha",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg",
      email: "john@heroui.com",
      fallback: "J",
      id: "4",
      name: "John",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg",
      email: "jane@heroui.com",
      fallback: "J",
      id: "5",
      name: "Jane",
    },
  ];

  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const {contains} = useFilter({sensitivity: "base"});

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Select a user"
      selectionMode="single"
      value={selectedKey}
      onChange={setSelectedKey}
    >
      <Label>User</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            const selectedItems = state.selectedItems;

            if (selectedItems.length > 1) {
              return `${selectedItems.length} users selected`;
            }

            const selectedItem = users.find((user) => user.id === selectedItems[0]?.key);

            if (!selectedItem) {
              return defaultChildren;
            }

            return (
              <div className="flex items-center gap-2">
                <Avatar className="size-4" size="sm">
                  <AvatarImage src={selectedItem.avatarUrl} />
                  <AvatarFallback>{selectedItem.fallback}</AvatarFallback>
                </Avatar>
                <span>{selectedItem.name}</span>
              </div>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search users..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {users.map((user) => (
              <ListBox.Item key={user.id} id={user.id} textValue={user.name}>
                <Avatar size="sm">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.fallback}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <Label>{user.name}</Label>
                  <Description>{user.email}</Description>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

#### User Selection Multiple

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Description,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function UserSelectionMultiple() {
  const users = [
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg",
      email: "bob@heroui.com",
      fallback: "B",
      id: "1",
      name: "Bob",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg",
      email: "fred@heroui.com",
      fallback: "F",
      id: "2",
      name: "Fred",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg",
      email: "martha@heroui.com",
      fallback: "M",
      id: "3",
      name: "Martha",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg",
      email: "john@heroui.com",
      fallback: "J",
      id: "4",
      name: "John",
    },
    {
      avatarUrl: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg",
      email: "jane@heroui.com",
      fallback: "J",
      id: "5",
      name: "Jane",
    },
  ];

  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const {contains} = useFilter({sensitivity: "base"});

  const onRemoveTags = (keys: Set<Key>) => {
    setSelectedKeys((prev) => prev.filter((key) => !keys.has(key)));
  };

  return (
    <Autocomplete
      className="w-[256px]"
      defaultValue={["1", "2"]}
      placeholder="Select your teammates"
      selectionMode="multiple"
      value={selectedKeys}
      onChange={(keys) => setSelectedKeys(keys as Key[])}
    >
      <Label>Users</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            const selectedItemsKeys = state.selectedItems.map((item) => item.key);

            return (
              <TagGroup size="sm" onRemove={onRemoveTags}>
                <TagGroup.List>
                  {selectedItemsKeys.map((selectedItemKey) => {
                    const selectedItem = users.find((user) => user.id === selectedItemKey);

                    if (!selectedItem) {
                      return null;
                    }

                    return (
                      <Tag key={selectedItem.id} id={selectedItem.id}>
                        <Avatar className="size-4" size="sm">
                          <AvatarImage src={selectedItem.avatarUrl} />
                          <AvatarFallback>{selectedItem.fallback}</AvatarFallback>
                        </Avatar>
                        <span>{selectedItem.name}</span>
                      </Tag>
                    );
                  })}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search users..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No results found</EmptyState>}>
            {users.map((user) => (
              <ListBox.Item key={user.id} id={user.id} textValue={user.name}>
                <Avatar size="sm">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.fallback}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <Label>{user.name}</Label>
                  <Description>{user.email}</Description>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

#### Location Search

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  Description,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

interface City {
  name: string;
  country: string;
}

export function LocationSearch() {
  const allCities: City[] = [
    {country: "USA", name: "New York"},
    {country: "USA", name: "Los Angeles"},
    {country: "USA", name: "Chicago"},
    {country: "UK", name: "London"},
    {country: "France", name: "Paris"},
    {country: "Japan", name: "Tokyo"},
    {country: "Australia", name: "Sydney"},
    {country: "Canada", name: "Toronto"},
    {country: "Germany", name: "Berlin"},
    {country: "Spain", name: "Madrid"},
  ];

  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {contains} = useFilter({sensitivity: "base"});

  // Simulate async filtering
  const customFilter = (text: string, inputValue: string) => {
    if (!inputValue) return true;
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);

    return contains(text, inputValue);
  };

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Search for a city"
      selectionMode="single"
      value={selectedKey}
      onChange={setSelectedKey}
    >
      <Label>City</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={customFilter}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search cities..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            renderEmptyState={() => (
              <EmptyState>{isLoading ? "Searching..." : "No cities found"}</EmptyState>
            )}
          >
            {allCities.map((city) => (
              <ListBox.Item key={city.name} id={city.name} textValue={city.name}>
                <div className="flex flex-col">
                  <Label>{city.name}</Label>
                  <Description>{city.country}</Description>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

#### Tag Group Selection

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function TagGroupSelection() {
  const tags = [
    {id: "react", name: "React"},
    {id: "typescript", name: "TypeScript"},
    {id: "javascript", name: "JavaScript"},
    {id: "nodejs", name: "Node.js"},
    {id: "python", name: "Python"},
    {id: "vue", name: "Vue"},
    {id: "angular", name: "Angular"},
    {id: "nextjs", name: "Next.js"},
  ];

  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const {contains} = useFilter({sensitivity: "base"});

  const onRemoveTags = (keys: Set<Key>) => {
    setSelectedKeys((prev) => prev.filter((key) => !keys.has(key)));
  };

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Select tags"
      selectionMode="multiple"
      value={selectedKeys}
      onChange={(keys) => setSelectedKeys(keys as Key[])}
    >
      <Label>Tags</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            const selectedItemsKeys = state.selectedItems.map((item) => item.key);

            return (
              <TagGroup size="sm" onRemove={onRemoveTags}>
                <TagGroup.List>
                  {selectedItemsKeys.map((selectedItemKey) => {
                    const tag = tags.find((t) => t.id === selectedItemKey);

                    if (!tag) return null;

                    return (
                      <Tag key={tag.id} id={tag.id}>
                        {tag.name}
                      </Tag>
                    );
                  })}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search tags..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No tags found</EmptyState>}>
            {tags.map((tag) => (
              <ListBox.Item key={tag.id} id={tag.id} textValue={tag.name}>
                {tag.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

#### Email Recipients

```tsx
"use client";

import type {Key} from "@heroui/react";

import {
  Autocomplete,
  Description,
  EmptyState,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from "@heroui/react";
import {useState} from "react";

export function EmailRecipients() {
  const emails = [
    {email: "alice@example.com", id: "alice@example.com", name: "Alice Johnson"},
    {email: "bob@example.com", id: "bob@example.com", name: "Bob Smith"},
    {email: "charlie@example.com", id: "charlie@example.com", name: "Charlie Brown"},
    {email: "diana@example.com", id: "diana@example.com", name: "Diana Prince"},
    {email: "eve@example.com", id: "eve@example.com", name: "Eve Wilson"},
  ];

  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const {contains} = useFilter({sensitivity: "base"});

  const onRemoveTags = (keys: Set<Key>) => {
    setSelectedKeys((prev) => prev.filter((key) => !keys.has(key)));
  };

  return (
    <Autocomplete
      className="w-[256px]"
      placeholder="Add recipients"
      selectionMode="multiple"
      value={selectedKeys}
      onChange={(keys) => setSelectedKeys(keys as Key[])}
    >
      <Label>To</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            const selectedItemsKeys = state.selectedItems.map((item) => item.key);

            return (
              <TagGroup size="sm" onRemove={onRemoveTags}>
                <TagGroup.List>
                  {selectedItemsKeys.map((selectedItemKey) => {
                    const email = emails.find((e) => e.id === selectedItemKey);

                    if (!email) return null;

                    return (
                      <Tag key={email.id} id={email.id}>
                        {email.email}
                      </Tag>
                    );
                  })}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search emails..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No recipients found</EmptyState>}>
            {emails.map((email) => (
              <ListBox.Item key={email.id} id={email.id} textValue={email.email}>
                <div className="flex flex-col">
                  <Label>{email.name}</Label>
                  <Description>{email.email}</Description>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

## Related Components

- **Listbox**: Scrollable list of selectable items
- **Popover**: Displays content in context with a trigger
- **Input**: Single-line text input built on React Aria

## Styling

### Passing Tailwind CSS classes

```tsx
import {Autocomplete, SearchField, ListBox} from "@heroui/react";

function CustomAutocomplete() {
  return (
    <Autocomplete className="w-full">
      <Label>State</Label>
      <Autocomplete.Trigger className="rounded-lg border bg-surface p-2">
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter>
          <SearchField>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search..." />
            </SearchField.Group>
          </SearchField>
          <ListBox>
            <ListBox.Item id="1" textValue="Item 1" className="hover:bg-surface-secondary">
              Item 1
            </ListBox.Item>
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

```

### Customizing the component classes

To customize the Autocomplete component classes, you can use the `@layer components` directive.

<br />
[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .autocomplete {
    @apply flex flex-col gap-1;
  }

  .autocomplete__trigger {
    @apply rounded-lg border border-border bg-surface p-2;
  }

  .autocomplete__value {
    @apply text-current;
  }

  .autocomplete__clear-button {
    @apply text-muted hover:text-foreground;
  }

  .autocomplete__indicator {
    @apply text-muted;
  }

  .autocomplete__popover {
    @apply rounded-lg border border-border bg-surface p-2;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Autocomplete component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/autocomplete.css)):

#### Base Classes

- `.autocomplete` - Base autocomplete container
- `.autocomplete__trigger` - The button that triggers the autocomplete
- `.autocomplete__value` - The displayed value or placeholder
- `.autocomplete__clear-button` - The clear button that removes the selected value
- `.autocomplete__indicator` - The dropdown indicator icon
- `.autocomplete__popover` - The popover container
- `.autocomplete__filter` - The filter wrapper

#### Variant Classes

- `.autocomplete--primary` - Primary variant with shadow (default)
- `.autocomplete--secondary` - Secondary variant without shadow, suitable for use in surfaces

#### State Classes

- `.autocomplete[data-invalid="true"]` - Invalid state
- `.autocomplete__trigger[data-focus-visible="true"]` - Focused trigger state
- `.autocomplete__trigger[data-disabled="true"]` - Disabled trigger state
- `.autocomplete__value[data-placeholder="true"]` - Placeholder state
- `.autocomplete__clear-button[data-empty="true"]` - Clear button hidden when no selection
- `.autocomplete__indicator[data-open="true"]` - Open indicator state

### Interactive States

The component supports both CSS pseudo-classes and data attributes for flexibility:

- **Hover**: `:hover` or `[data-hovered="true"]` on trigger
- **Focus**: `:focus-visible` or `[data-focus-visible="true"]` on trigger
- **Disabled**: `:disabled` or `[data-disabled="true"]` on autocomplete
- **Open**: `[data-open="true"]` on indicator

## API Reference

### Autocomplete Props

| Prop            | Type                                    | Default            | Description                                              |
| --------------- | --------------------------------------- | ------------------ | -------------------------------------------------------- |
| `placeholder`   | `string`                                | `'Select an item'` | Temporary text that occupies the autocomplete when it is empty |
| `selectionMode` | `"single" \| "multiple"`                | `"single"`         | Whether single or multiple selection is enabled          |
| `allowsEmptyCollection` | `boolean`                        | `false`            | Whether the autocomplete allows an empty collection. When true, the autocomplete can function even with no items. |
| `isOpen`        | `boolean`                               | -                  | Sets the open state of the popover (controlled)             |
| `defaultOpen`   | `boolean`                               | -                  | Sets the default open state of the popover (uncontrolled)   |
| `onOpenChange`  | `(isOpen: boolean) => void`             | -                  | Handler called when the open state changes               |
| `disabledKeys`  | `Iterable<Key>`                         | -                  | Keys of disabled items                                   |
| `isDisabled`    | `boolean`                               | -                  | Whether the autocomplete is disabled                           |
| `value`         | `Key \| Key[] \| null`                  | -                  | Current value (controlled)                               |
| `defaultValue`  | `Key \| Key[] \| null`                  | -                  | Default value (uncontrolled)                             |
| `onChange`      | `(value: Key \| Key[] \| null) => void` | -                  | Handler called when the value changes                    |
| `isRequired`    | `boolean`                               | -                  | Whether user input is required                           |
| `isInvalid`     | `boolean`                               | -                  | Whether the autocomplete value is invalid                      |
| `name`          | `string`                                | -                  | The name of the input, used when submitting an HTML form |
| `fullWidth`     | `boolean`                               | `false`             | Whether the autocomplete should take full width of its container |
| `variant`       | `"primary" \| "secondary"`             | `"primary"`         | Visual variant of the component. `primary` is the default style with shadow. `secondary` is a lower emphasis variant without shadow, suitable for use in surfaces. |
| `className`     | `string`                                | -                  | Additional CSS classes                                   |
| `children`      | `ReactNode \| RenderFunction`           | -                  | Autocomplete content or render function                        |

### Autocomplete.Trigger Props

| Prop        | Type                          | Default | Description                        |
| ----------- | ----------------------------- | ------- | ---------------------------------- |
| `className` | `string`                      | -       | Additional CSS classes             |
| `children`  | `ReactNode \| RenderFunction` | -       | Trigger content or render function |

### Autocomplete.Value Props

| Prop        | Type                          | Default | Description                      |
| ----------- | ----------------------------- | ------- | -------------------------------- |
| `className` | `string`                      | -       | Additional CSS classes           |
| `children`  | `ReactNode \| RenderFunction` | -       | Value content or render function |

### Autocomplete.Indicator Props

| Prop        | Type        | Default | Description              |
| ----------- | ----------- | ------- | ------------------------ |
| `className` | `string`    | -       | Additional CSS classes   |
| `children`  | `ReactNode` | -       | Custom indicator content |

### Autocomplete.ClearButton Props

| Prop        | Type                          | Default | Description                      |
| ----------- | ----------------------------- | ------- | -------------------------------- |
| `className` | `string`                      | -       | Additional CSS classes           |
| `onClick`   | `(e: MouseEvent) => void`     | -       | Handler called when button is clicked |
| `ref`       | `RefObject<HTMLButtonElement>` | -       | Ref to the clear button element  |

### Autocomplete.Popover Props

| Prop        | Type                                                                                                                                                                                                                                                                                                                     | Default    | Description                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------ |
| `placement` | `"bottom" \| "bottom left" \| "bottom right" \| "bottom start" \| "bottom end" \| "top" \| "top left" \| "top right" \| "top start" \| "top end" \| "left" \| "left top" \| "left bottom" \| "start" \| "start top" \| "start bottom" \| "right" \| "right top" \| "right bottom" \| "end" \| "end top" \| "end bottom"` | `"bottom"` | Placement of the popover relative to the trigger |
| `className` | `string`                                                                                                                                                                                                                                                                                                                 | -          | Additional CSS classes                           |
| `children`  | `ReactNode`                                                                                                                                                                                                                                                                                                              | -          | Content children                                 |

### Autocomplete.Filter Props

| Prop         | Type                                           | Default | Description                      |
| ------------ | ---------------------------------------------- | ------- | -------------------------------- |
| `filter`     | `(text: string, input: string) => boolean`     | -       | Custom filter function           |
| `inputValue` | `string`                                       | -       | Controlled input value          |
| `onInputChange` | `(value: string) => void`                  | -       | Handler called when input value changes |
| `children`   | `ReactNode`                                    | -       | Filter content (SearchField and ListBox) |

### useFilter Hook

The `useFilter` hook from React Aria provides filtering functions for autocomplete functionality.

```tsx
import {useFilter} from "@heroui/react";

const {contains} = useFilter({sensitivity: "base"});

<Autocomplete.Filter filter={contains}>
  <SearchField>...</SearchField>
  <ListBox>...</ListBox>
</Autocomplete.Filter>

```

**Options:**

| Option        | Type                                                         | Default      | Description                     |
| ------------- | ------------------------------------------------------------ | ------------ | ------------------------------- |
| `sensitivity` | `"base" \| "accent" \| "case" \| "variant"`                  | `"base"`     | Locale sensitivity for matching |

**Returns:**

| Function        | Type                                                | Description                     |
| --------------- | --------------------------------------------------- | ------------------------------- |
| `contains`      | `(string: string, substring: string) => boolean`          | Returns whether a string contains a given substring |
| `startsWith`    | `(string: string, substring: string) => boolean`          | Returns whether a string starts with a given substring    |
| `endsWith`      | `(string: string, substring: string) => boolean`          | Returns whether a string ends with a given substring     |

### RenderProps

When using render functions with Autocomplete.Value, these values are provided:

| Prop              | Type          | Description                        |
| ----------------- | ------------- | ---------------------------------- |
| `defaultChildren` | `ReactNode`   | The default rendered value         |
| `isPlaceholder`   | `boolean`     | Whether the value is a placeholder |
| `state`           | `SelectState` | The state of the autocomplete      |
| `selectedItems`   | `Node[]`      | The currently selected items       |

## Accessibility

The Autocomplete component implements the ARIA select pattern with filtering and provides:

- Full keyboard navigation support
- Screen reader announcements for selection changes
- Proper focus management
- Support for disabled states
- Search functionality with filtering
- HTML form integration

For more information, see the [React Aria Select documentation](https://react-spectrum.adobe.com/react-aria/Select.html).
</page>

<page url="/en/docs/react/components/avatar">
# Avatar

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/avatar
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(media)/avatar.mdx
> Display user profile images with customizable fallback content


***

## Import

```tsx
import { Avatar } from '@heroui/react';

```

### Usage

```tsx
import {Avatar} from "@heroui/react";

export function Basic() {
  return (
    <div className="flex items-center gap-4">
      <Avatar>
        <Avatar.Image alt="John Doe" src="https://img.heroui.chat/image/avatar?w=400&h=400&u=3" />
        <Avatar.Fallback>JD</Avatar.Fallback>
      </Avatar>
      <Avatar>
        <Avatar.Image
          alt="Blue"
          src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg"
        />
        <Avatar.Fallback>B</Avatar.Fallback>
      </Avatar>
      <Avatar>
        <Avatar.Fallback>JR</Avatar.Fallback>
      </Avatar>
    </div>
  );
}

```

### Anatomy

Import the Avatar component and access all parts using dot notation.

```tsx
import { Avatar } from '@heroui/react';

export default () => (
  <Avatar>
    <Avatar.Image/>
    <Avatar.Fallback/>
  </Avatar>
)

```

### Sizes

```tsx
import {Avatar} from "@heroui/react";

export function Sizes() {
  return (
    <div className="flex items-center gap-4">
      <Avatar size="sm">
        <Avatar.Image
          alt="Small Avatar"
          src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg"
        />
        <Avatar.Fallback>SM</Avatar.Fallback>
      </Avatar>
      <Avatar size="md">
        <Avatar.Image
          alt="Medium Avatar"
          src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg"
        />
        <Avatar.Fallback>MD</Avatar.Fallback>
      </Avatar>
      <Avatar size="lg">
        <Avatar.Image
          alt="Large Avatar"
          src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg"
        />
        <Avatar.Fallback>LG</Avatar.Fallback>
      </Avatar>
    </div>
  );
}

```

### Colors

```tsx
import {Avatar} from "@heroui/react";

export function Colors() {
  return (
    <div className="flex items-center gap-4">
      <Avatar color="default">
        <Avatar.Fallback>DF</Avatar.Fallback>
      </Avatar>
      <Avatar color="accent">
        <Avatar.Fallback>AC</Avatar.Fallback>
      </Avatar>
      <Avatar color="success">
        <Avatar.Fallback>SC</Avatar.Fallback>
      </Avatar>
      <Avatar color="warning">
        <Avatar.Fallback>WR</Avatar.Fallback>
      </Avatar>
      <Avatar color="danger">
        <Avatar.Fallback>DG</Avatar.Fallback>
      </Avatar>
    </div>
  );
}

```

### Variants

```tsx
import {Person} from "@gravity-ui/icons";
import {Avatar, Separator} from "@heroui/react";

export function Variants() {
  const colors = ["accent", "default", "success", "warning", "danger"] as const;
  const variants = [
    {content: "AG", label: "letter", type: "letter"},
    {content: "AG", label: "letter soft", type: "letter-soft"},
    {content: <Person />, label: "icon", type: "icon"},
    {content: <Person />, label: "icon soft", type: "icon-soft"},
    {
      content: [
        "https://img.heroui.chat/image/avatar?w=400&h=400&u=3",
        "https://img.heroui.chat/image/avatar?w=400&h=400&u=4",
        "https://img.heroui.chat/image/avatar?w=400&h=400&u=5",
        "https://img.heroui.chat/image/avatar?w=400&h=400&u=8",
        "https://img.heroui.chat/image/avatar?w=400&h=400&u=16",
      ],
      label: "img",
      type: "img",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {/* Color labels header */}
      <div className="flex items-center gap-3">
        <div className="w-24 shrink-0" />
        {colors.map((color) => (
          <div key={color} className="flex w-20 shrink-0 items-center justify-center">
            <span className="text-xs text-muted capitalize">{color}</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Variant rows */}
      {variants.map((variant) => (
        <div key={variant.label} className="flex items-center gap-3">
          <div className="w-24 shrink-0 text-sm text-muted">{variant.label}</div>
          {colors.map((color, colorIndex) => (
            <div key={color} className="flex w-20 shrink-0 items-center justify-center">
              <Avatar color={color} variant={variant.type.includes("soft") ? "soft" : undefined}>
                {variant.type === "img" ? (
                  <>
                    <Avatar.Image
                      alt={`Avatar ${color}`}
                      src={Array.isArray(variant.content) ? variant.content[colorIndex] : ""}
                    />
                    <Avatar.Fallback>{color.charAt(0).toUpperCase()}</Avatar.Fallback>
                  </>
                ) : (
                  <Avatar.Fallback>{variant.content}</Avatar.Fallback>
                )}
              </Avatar>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

```

### Fallback Content

```tsx
import {Person} from "@gravity-ui/icons";
import {Avatar} from "@heroui/react";

export function Fallback() {
  return (
    <div className="flex items-center gap-4">
      {/* Text fallback */}
      <Avatar>
        <Avatar.Fallback>JD</Avatar.Fallback>
      </Avatar>

      {/* Icon fallback */}
      <Avatar>
        <Avatar.Fallback>
          <Person />
        </Avatar.Fallback>
      </Avatar>

      {/* Fallback with delay */}
      <Avatar>
        <Avatar.Image
          alt="Delayed Avatar"
          src="https://invalid-url-to-show-fallback.com/image.jpg"
        />
        <Avatar.Fallback delayMs={600}>NA</Avatar.Fallback>
      </Avatar>

      {/* Custom styled fallback */}
      <Avatar>
        <Avatar.Fallback className="border-none bg-gradient-to-br from-pink-500 to-purple-500 text-white">
          GB
        </Avatar.Fallback>
      </Avatar>
    </div>
  );
}

```

### Avatar Group

```tsx
import {Avatar} from "@heroui/react";

const users = [
  {
    id: 1,
    image: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg",
    name: "John Doe",
  },
  {
    id: 2,
    image: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg",
    name: "Kate Wilson",
  },
  {
    id: 3,
    image: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg",
    name: "Emily Chen",
  },
  {
    id: 4,
    image: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg",
    name: "Michael Brown",
  },
  {
    id: 5,
    image: "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg",
    name: "Olivia Davis",
  },
];

export function Group() {
  return (
    <div className="flex flex-col gap-6">
      {/* Basic avatar group */}
      <div className="flex -space-x-2">
        {users.slice(0, 4).map((user) => (
          <Avatar key={user.id} className="ring-2 ring-background">
            <Avatar.Image alt={user.name} src={user.image} />
            <Avatar.Fallback>
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Avatar.Fallback>
          </Avatar>
        ))}
      </div>

      {/* Avatar group with counter */}
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.id} className="ring-2 ring-background">
            <Avatar.Image alt={user.name} src={user.image} />
            <Avatar.Fallback>
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Avatar.Fallback>
          </Avatar>
        ))}
        <Avatar className="ring-2 ring-background">
          <Avatar.Fallback className="text-xs">+{users.length - 3}</Avatar.Fallback>
        </Avatar>
      </div>
    </div>
  );
}

```

### Custom Styles

```tsx
import {Avatar} from "@heroui/react";

export function CustomStyles() {
  return (
    <div className="flex items-center gap-4">
      {/* Custom size with Tailwind classes */}
      <Avatar className="size-16">
        <Avatar.Image
          alt="Extra Large"
          src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg"
        />
        <Avatar.Fallback>XL</Avatar.Fallback>
      </Avatar>

      {/* Square avatar */}
      <Avatar className="rounded-lg">
        <Avatar.Image
          alt="Square Avatar"
          src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg"
        />
        <Avatar.Fallback className="rounded-lg">SQ</Avatar.Fallback>
      </Avatar>

      {/* Gradient border */}
      <Avatar className="bg-gradient-to-tr from-pink-500 to-yellow-500 p-0.5">
        <div className="size-full rounded-full bg-background p-0.5">
          <Avatar.Image
            alt="Gradient Border"
            className="rounded-full"
            src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg"
          />
          <Avatar.Fallback className="border-none">GB</Avatar.Fallback>
        </div>
      </Avatar>

      {/* Status indicator */}
      <div className="relative">
        <Avatar>
          <Avatar.Image
            alt="Online User"
            src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg"
          />
          <Avatar.Fallback>ON</Avatar.Fallback>
        </Avatar>
        <span className="absolute right-0 bottom-0 size-3 rounded-full bg-green-500 ring-2 ring-background" />
      </div>
    </div>
  );
}

```

## Related Components

- **Separator**: Visual divider between content
- **Badge**: Small indicator positioned relative to another element

## Styling

### Passing Tailwind CSS classes

```tsx
import { Avatar } from '@heroui/react';

function CustomAvatar() {
  return (
    <Avatar className="size-20">
      <Avatar.Image src="..." alt="..." />
      <Avatar.Fallback>XL</Avatar.Fallback>
    </Avatar>
  );
}

```

### Customizing the component classes

To customize the Avatar component classes, you can use the `@layer components` directive.
<br/>[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .avatar {
    @apply size-16 border-2 border-primary;
  }

  .avatar__fallback {
    @apply bg-gradient-to-br from-purple-500 to-pink-500;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Avatar component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/avatar.css)):

#### Base Classes

- `.avatar` - Base container with default size (size-10)
- `.avatar__image` - Image element with aspect-square sizing
- `.avatar__fallback` - Fallback container with centered content

#### Size Modifiers

- `.avatar--sm` - Small avatar (size-8)
- `.avatar--md` - Medium avatar (default, no additional styles)
- `.avatar--lg` - Large avatar (size-12)

#### Variant Modifiers

- `.avatar--soft` - Soft variant with lighter background

#### Color Modifiers

- `.avatar__fallback--default` - Default text color
- `.avatar__fallback--accent` - Accent text color
- `.avatar__fallback--success` - Success text color
- `.avatar__fallback--warning` - Warning text color
- `.avatar__fallback--danger` - Danger text color

## API Reference

### Avatar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Avatar size |
| `color` | `'default' \| 'accent' \| 'success' \| 'warning' \| 'danger'` | `'default'` | Fallback color theme |
| `variant` | `'default' \| 'soft'` | `'default'` | Visual style variant |
| `className` | `string` | - | Additional CSS classes |

### Avatar.Image Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | Image source URL |
| `srcSet` | `string` | - | The image `srcset` attribute for responsive images |
| `sizes` | `string` | - | The image `sizes` attribute for responsive images |
| `alt` | `string` | - | Alternative text for the image |
| `onLoad` | `(event: SyntheticEvent<HTMLImageElement>) => void` | - | Callback when the image loads successfully |
| `onError` | `(event: SyntheticEvent<HTMLImageElement>) => void` | - | Callback when there's an error loading the image |
| `crossOrigin` | `'anonymous' \| 'use-credentials'` | - | CORS setting for the image request |
| `loading` | `'eager' \| 'lazy'` | - | Native lazy loading attribute |
| `className` | `string` | - | Additional CSS classes |

### Avatar.Fallback Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `delayMs` | `number` | - | Delay before showing fallback (prevents flash) |
| `color` | `'default' \| 'accent' \| 'success' \| 'warning' \| 'danger'` | - | Override color from parent |
| `className` | `string` | - | Additional CSS classes |
</page>

<page url="/en/docs/react/components/badge">
# Badge

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/badge
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(data-display)/badge.mdx
> Displays a small indicator positioned relative to another element, commonly used for notification counts, status dots, and labels


***

## Import

```tsx
import { Badge } from '@heroui/react';

```

## Anatomy

Badge is designed to be positioned relative to another element using `Badge.Anchor`. Plain-text children are automatically wrapped in `<Badge.Label>`.

> For standalone label usage, use the [Chip](/docs/react/components/chip) component instead.

```tsx
<Badge.Anchor>
  <Avatar />
  <Badge color="danger">5</Badge>
</Badge.Anchor>

```

### Usage

```tsx
import {Avatar, Badge} from "@heroui/react";

const GREEN_AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";
const ORANGE_AVATAR_URL =
  "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg";
const BLUE_AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg";

export function BadgeBasic() {
  return (
    <div className="flex items-center gap-6">
      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={GREEN_AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="danger" size="sm">
          5
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={ORANGE_AVATAR_URL} />
          <Avatar.Fallback>AB</Avatar.Fallback>
        </Avatar>
        <Badge color="accent" size="sm">
          New
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={BLUE_AVATAR_URL} />
          <Avatar.Fallback>CD</Avatar.Fallback>
        </Avatar>
        <Badge color="success" placement="bottom-right" size="sm" />
      </Badge.Anchor>
    </div>
  );
}

```

### Colors

```tsx
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeColors() {
  const colors = ["default", "accent", "success", "warning", "danger"] as const;

  return (
    <div className="flex items-center gap-6">
      {colors.map((color) => (
        <Badge.Anchor key={color}>
          <Avatar>
            <Avatar.Image src={AVATAR_URL} />
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar>
          <Badge color={color} size="sm" />
        </Badge.Anchor>
      ))}
    </div>
  );
}

```

### Sizes

```tsx
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeSizes() {
  const sizes = ["sm", "md", "lg"] as const;

  return (
    <div className="flex items-center gap-6">
      {sizes.map((size) => (
        <Badge.Anchor key={size}>
          <Avatar size={size}>
            <Avatar.Image src={AVATAR_URL} />
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar>
          <Badge color="danger" size={size}>
            5
          </Badge>
        </Badge.Anchor>
      ))}
    </div>
  );
}

```

### Variants

```tsx
import {Avatar, Badge, Separator} from "@heroui/react";
import React from "react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeVariants() {
  const variants = ["primary", "secondary", "soft"] as const;
  const colors = ["accent", "default", "success", "warning", "danger"] as const;

  return (
    <div className="flex flex-col gap-8">
      {variants.map((variant, index) => (
        <React.Fragment key={variant}>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-muted capitalize">{variant}</h3>
            <div className="flex items-center gap-6">
              {colors.map((color) => (
                <Badge.Anchor key={color}>
                  <Avatar>
                    <Avatar.Image src={AVATAR_URL} />
                    <Avatar.Fallback>JD</Avatar.Fallback>
                  </Avatar>
                  <Badge color={color} size="sm" variant={variant}>
                    5
                  </Badge>
                </Badge.Anchor>
              ))}
            </div>
          </div>
          {index < variants.length - 1 && <Separator />}
        </React.Fragment>
      ))}
    </div>
  );
}

```

### Placements

```tsx
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgePlacements() {
  const placements = ["top-right", "top-left", "bottom-right", "bottom-left"] as const;

  return (
    <div className="flex items-center gap-8">
      {placements.map((placement) => (
        <div key={placement} className="flex flex-col items-center gap-2">
          <Badge.Anchor>
            <Avatar>
              <Avatar.Image src={AVATAR_URL} />
              <Avatar.Fallback>JD</Avatar.Fallback>
            </Avatar>
            <Badge color="accent" placement={placement} size="sm" />
          </Badge.Anchor>
          <span className="text-xs text-muted">{placement}</span>
        </div>
      ))}
    </div>
  );
}

```

### With Content

Badge supports text, numbers, and icons as content. When no children are provided, it renders as a dot indicator.

```tsx
import {Bell} from "@gravity-ui/icons";
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeWithContent() {
  return (
    <div className="flex items-center gap-6">
      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="danger" size="sm">
          5
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="danger" size="sm">
          New
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="danger" size="sm">
          99+
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="accent" size="sm">
          <Bell className="size-2.5" />
        </Badge>
      </Badge.Anchor>
    </div>
  );
}

```

### Dot Badge

Empty badges act as status indicators — useful for online/offline states or activity signals.

```tsx
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeDot() {
  const colors = ["accent", "success", "warning", "danger"] as const;

  return (
    <div className="flex items-center gap-6">
      {colors.map((color) => (
        <Badge.Anchor key={color}>
          <Avatar>
            <Avatar.Image src={AVATAR_URL} />
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar>
          <Badge color={color} placement="bottom-right" size="sm" />
        </Badge.Anchor>
      ))}
    </div>
  );
}

```

## Related Components

- **Avatar**: Display user profile images
- **Chip**: Compact elements for tags and filters

## Styling

### Passing Tailwind CSS classes

You can style the root container and individual slots:

```tsx
import {Badge, Avatar} from '@heroui/react';

function CustomBadge() {
  return (
    <Badge.Anchor>
      <Avatar />
      <Badge className="border-2 border-white" color="danger">
        <Badge.Label className="font-bold">99+</Badge.Label>
      </Badge>
    </Badge.Anchor>
  );
}

```

### Customizing the component classes

To customize the Badge component classes, you can use the `@layer components` directive.
<br/>[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .badge {
    @apply rounded-full text-xs;
  }

  .badge__label {
    @apply font-semibold;
  }

  .badge--accent {
    @apply shadow-sm;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Badge component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/badge.css)):

#### Base Classes

- `.badge` - Base badge container styles
- `.badge__label` - Label text slot styles
- `.badge-anchor` - Positioning wrapper for the anchored element

#### Color Classes

- `.badge--accent` - Accent color variant
- `.badge--danger` - Danger color variant
- `.badge--default` - Default color variant
- `.badge--success` - Success color variant
- `.badge--warning` - Warning color variant

#### Variant Classes

- `.badge--primary` - Primary variant with filled background
- `.badge--secondary` - Secondary variant with default background
- `.badge--soft` - Soft variant with lighter background

#### Size Classes

- `.badge--sm` - Small size
- `.badge--md` - Medium size (default)
- `.badge--lg` - Large size

#### Placement Classes

- `.badge--top-right` - Position at top-right corner (default)
- `.badge--top-left` - Position at top-left corner
- `.badge--bottom-right` - Position at bottom-right corner
- `.badge--bottom-left` - Position at bottom-left corner

#### Compound Variant Classes

Badges support combining variant and color classes (e.g., `.badge--primary.badge--accent`). The following combinations have default styles defined:

**Primary Variants:**
- `.badge--primary.badge--accent` - Primary accent with filled background
- `.badge--primary.badge--default` - Primary default with filled background
- `.badge--primary.badge--success` - Primary success with filled background
- `.badge--primary.badge--warning` - Primary warning with filled background
- `.badge--primary.badge--danger` - Primary danger with filled background

**Soft Variants:**
- `.badge--soft.badge--accent` - Soft accent with lighter background
- `.badge--soft.badge--default` - Soft default with lighter background
- `.badge--soft.badge--success` - Soft success with lighter background
- `.badge--soft.badge--warning` - Soft warning with lighter background
- `.badge--soft.badge--danger` - Soft danger with lighter background

## API Reference

### Badge Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Content to display inside the badge (text, number, or icon). When omitted, renders as a dot. |
| `className` | `string` | - | Additional CSS classes for the root element |
| `color` | `"default" \| "accent" \| "success" \| "warning" \| "danger"` | `"default"` | Color variant of the badge |
| `variant` | `"primary" \| "secondary" \| "soft"` | `"primary"` | Visual style variant |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size of the badge |
| `placement` | `"top-right" \| "top-left" \| "bottom-right" \| "bottom-left"` | `"top-right"` | Position of the badge relative to its anchor |

### Badge.Anchor Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | The element to anchor the badge to, plus the Badge itself |
| `className` | `string` | - | Additional CSS classes for the anchor wrapper |

### Badge.Label Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Label text content |
| `className` | `string` | - | Additional CSS classes for the label slot |
</page>

<page url="/en/docs/react/components/breadcrumbs">
# Breadcrumbs

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/breadcrumbs
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(navigation)/breadcrumbs.mdx
> Navigation breadcrumbs showing the current page's location within a hierarchy


***

## Import

```tsx
import { Breadcrumbs } from '@heroui/react';

```

### Usage

```tsx
"use client";

import {Breadcrumbs} from "@heroui/react";

export default function BreadcrumbsBasic() {
  return (
    <Breadcrumbs>
      <Breadcrumbs.Item href="#">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item href="#">Products</Breadcrumbs.Item>
      <Breadcrumbs.Item href="#">Electronics</Breadcrumbs.Item>
      <Breadcrumbs.Item>Laptop</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

```

### Anatomy

Import the Breadcrumbs component and access all parts using dot notation.

```tsx
import { Breadcrumbs } from '@heroui/react';

export default () => (
  <Breadcrumbs>
    <Breadcrumbs.Item href="#">Home</Breadcrumbs.Item>
    <Breadcrumbs.Item href="#">Category</Breadcrumbs.Item>
    <Breadcrumbs.Item>Current Page</Breadcrumbs.Item>
  </Breadcrumbs>
)

```

### Navigation Levels

```tsx
"use client";

import {Breadcrumbs} from "@heroui/react";

export default function BreadcrumbsLevel2() {
  return (
    <Breadcrumbs>
      <Breadcrumbs.Item href="#">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item>Current Page</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

```

```tsx
"use client";

import {Breadcrumbs} from "@heroui/react";

export default function BreadcrumbsLevel3() {
  return (
    <Breadcrumbs>
      <Breadcrumbs.Item href="#">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item href="#">Category</Breadcrumbs.Item>
      <Breadcrumbs.Item>Current Page</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

```

### Custom Separator

```tsx
"use client";

import {Breadcrumbs} from "@heroui/react";

export default function BreadcrumbsCustomSeparator() {
  return (
    <Breadcrumbs
      separator={
        <svg viewBox="0 0 256 512" xmlns="http://www.w3.org/2000/svg">
          <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
        </svg>
      }
    >
      <Breadcrumbs.Item href="#">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item href="#">Products</Breadcrumbs.Item>
      <Breadcrumbs.Item href="#">Electronics</Breadcrumbs.Item>
      <Breadcrumbs.Item>Laptop</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

```

### Disabled State

```tsx
"use client";

import {Breadcrumbs} from "@heroui/react";

export default function BreadcrumbsDisabled() {
  return (
    <Breadcrumbs isDisabled>
      <Breadcrumbs.Item href="#">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item href="#">Products</Breadcrumbs.Item>
      <Breadcrumbs.Item href="#">Electronics</Breadcrumbs.Item>
      <Breadcrumbs.Item>Laptop</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

```

### Custom Render Function

```tsx
"use client";

import {Breadcrumbs} from "@heroui/react";

export function CustomRenderFunction() {
  return (
    <Breadcrumbs render={(props) => <ol {...props} data-custom="foo" />}>
      <Breadcrumbs.Item render={(props) => <li {...(props as any)} data-custom="bar" />}>
        Home
      </Breadcrumbs.Item>
      <Breadcrumbs.Item render={(props) => <li {...(props as any)} data-custom="bar" />}>
        Products
      </Breadcrumbs.Item>
      <Breadcrumbs.Item render={(props) => <li {...(props as any)} data-custom="bar" />}>
        Electronics
      </Breadcrumbs.Item>
      <Breadcrumbs.Item render={(props) => <li {...(props as any)} data-custom="bar" />}>
        Laptop
      </Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

```

## Styling

### Passing Tailwind CSS classes

```tsx
import { Breadcrumbs } from '@heroui/react';

function CustomBreadcrumbs() {
  return (
    <Breadcrumbs className="gap-2">
      <Breadcrumbs.Item href="#" className="text-blue-600">
        Home
      </Breadcrumbs.Item>
      <Breadcrumbs.Item>Current</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

```

### Customizing the component classes

To customize the Breadcrumbs component classes, you can use the `@layer components` directive.
<br/>[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .breadcrumbs {
    @apply gap-4 text-lg;
  }

  .breadcrumbs__link {
    @apply font-semibold;
  }

  .breadcrumbs__separator {
    @apply text-blue-500;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Breadcrumbs component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/breadcrumbs.css)):

#### Base Classes

- `.breadcrumbs` - Base breadcrumbs container
- `.breadcrumbs__item` - Individual breadcrumb item wrapper
- `.breadcrumbs__link` - Breadcrumb link element
- `.breadcrumbs__separator` - Separator icon between items

#### State Classes

- `.breadcrumbs__link[data-current="true"]` - Current page indicator (not a link)

### Interactive States

The component supports both CSS pseudo-classes and data attributes for flexibility:

- **Current**: `[data-current="true"]` on link (indicates current page)
- **Hover**: Link elements support standard hover states
- **Disabled**: `isDisabled` prop disables all links

## API Reference

### Breadcrumbs Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `separator` | `ReactNode` | chevron-right icon | Custom separator between breadcrumb items |
| `isDisabled` | `boolean` | `false` | Whether all breadcrumb links are disabled |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | The breadcrumb items |
| `render` | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, undefined>` | - | Overrides the default DOM element with a custom render function|

### Breadcrumbs.Item Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `href` | `string` | - | The URL to link to (omit for current page) |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode \| RenderFunction` | - | Item content or render function |
| `render` | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, BreadcrumbRenderProps>` | - | Overrides the default DOM element with a custom render function|

## Accessibility

Breadcrumbs uses React Aria Components' Breadcrumbs primitive, which provides:

- Proper ARIA attributes for navigation landmarks
- Current page indication via `aria-current="page"`
- Keyboard navigation support
- Screen reader announcements for navigation context

The last breadcrumb item (without `href`) automatically becomes the current page indicator.
</page>

<page url="/en/docs/react/components/button">
# Button

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/button
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(buttons)/button.mdx
> A clickable button component with multiple variants and states


***

## Import

```tsx
import { Button } from '@heroui/react';

```

### Usage

```tsx
"use client";

import {Button} from "@heroui/react";

export function Basic() {
  return <Button onPress={() => console.log("Button pressed")}>Click me</Button>;
}

```

### Variants

```tsx
import {Button} from "@heroui/react";

export function Variants() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="danger-soft">Danger Soft</Button>
    </div>
  );
}

```

### With Icons

```tsx
import {Envelope, Globe, Plus, TrashBin} from "@gravity-ui/icons";
import {Button} from "@heroui/react";

export function WithIcons() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button>
        <Globe />
        Search
      </Button>
      <Button variant="secondary">
        <Plus />
        Add Member
      </Button>
      <Button variant="tertiary">
        <Envelope />
        Email
      </Button>
      <Button variant="danger">
        <TrashBin />
        Delete
      </Button>
    </div>
  );
}

```

### Icon Only

```tsx
import {Ellipsis, Gear, TrashBin} from "@gravity-ui/icons";
import {Button} from "@heroui/react";

export function IconOnly() {
  return (
    <div className="flex gap-3">
      <Button isIconOnly variant="tertiary">
        <Ellipsis />
      </Button>
      <Button isIconOnly variant="secondary">
        <Gear />
      </Button>
      <Button isIconOnly variant="danger">
        <TrashBin />
      </Button>
    </div>
  );
}

```

### Loading

```tsx
"use client";

import {Button, Spinner} from "@heroui/react";
import React from "react";

export function Loading() {
  return (
    <Button isPending>
      {({isPending}) => (
        <>
          {isPending ? <Spinner color="current" size="sm" /> : null}
          Uploading...
        </>
      )}
    </Button>
  );
}

```

### Loading State

```tsx
"use client";

import {Paperclip} from "@gravity-ui/icons";
import {Button, Spinner} from "@heroui/react";
import React, {useState} from "react";

export function LoadingState() {
  const [isLoading, setLoading] = useState(false);

  const handlePress = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Button isPending={isLoading} onPress={handlePress}>
      {({isPending}) => (
        <>
          {isPending ? <Spinner color="current" size="sm" /> : <Paperclip />}
          {isPending ? "Uploading..." : "Upload File"}
        </>
      )}
    </Button>
  );
}

```

### Sizes

```tsx
import {Button} from "@heroui/react";

export function Sizes() {
  return (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}

```

### Full Width

```tsx
import {Plus} from "@gravity-ui/icons";
import {Button} from "@heroui/react";

export function FullWidth() {
  return (
    <div className="w-[400px] space-y-3">
      <Button fullWidth>Primary Button</Button>
      <Button fullWidth>
        <Plus />
        With Icon
      </Button>
    </div>
  );
}

```

### Disabled State

```tsx
import {Button} from "@heroui/react";

export function Disabled() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button isDisabled>Primary</Button>
      <Button isDisabled variant="secondary">
        Secondary
      </Button>
      <Button isDisabled variant="tertiary">
        Tertiary
      </Button>
      <Button isDisabled variant="outline">
        Outline
      </Button>
      <Button isDisabled variant="ghost">
        Ghost
      </Button>
      <Button isDisabled variant="danger">
        Danger
      </Button>
    </div>
  );
}

```

### Social Buttons

```tsx
import {Button} from "@heroui/react";
import {Icon} from "@iconify/react";

export function Social() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <Button className="w-full" variant="tertiary">
        <Icon icon="devicon:google" />
        Sign in with Google
      </Button>
      <Button className="w-full" variant="tertiary">
        <Icon icon="mdi:github" />
        Sign in with GitHub
      </Button>
      <Button className="w-full" variant="tertiary">
        <Icon icon="ion:logo-apple" />
        Sign in with Apple
      </Button>
    </div>
  );
}

```

### Custom Render Function

```tsx
"use client";

import {Button} from "@heroui/react";

export function CustomRenderFunction() {
  return (
    <Button
      render={(props, {isPressed}) => (
        <button {...props} data-custom={isPressed ? "pressed" : "bar"} />
      )}
    >
      Press me
    </Button>
  );
}

```

## Related Components

- **Popover**: Displays content in context with a trigger
- **Tooltip**: Contextual information on hover or focus
- **Form**: Form validation and submission handling

<RelatedShowcases component="Button" />

## Styling

### Passing Tailwind CSS classes

```tsx
import { Button } from '@heroui/react';

function CustomButton() {
  return (
    <Button className="bg-purple-500 text-white hover:bg-purple-600">
      Purple Button
    </Button>
  );
}

```

### Customizing the component classes

To customize the Button component classes, you can use the `@layer components` directive.
<br/>[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .button {
    @apply bg-purple-500 text-white hover:bg-purple-600;
  }

  .button--icon-only {
    @apply rounded-lg bg-blue-500;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### Adding custom variants

You can extend HeroUI components by wrapping them and adding your own custom variants.

```tsx
import type {ButtonProps} from "@heroui/react";
import type {VariantProps} from "tailwind-variants";

import {Button, buttonVariants} from "@heroui/react";
import {tv} from "tailwind-variants";

const myButtonVariants = tv({
  base: "text-md font-semibold shadow-md text-shadow-lg data-[pending=true]:opacity-40",
  defaultVariants: {
    radius: "full",
    variant: "primary",
  },
  extend: buttonVariants,
  variants: {
    radius: {
      full: "rounded-full",
      lg: "rounded-lg",
      md: "rounded-md",
      sm: "rounded-sm",
    },
    size: {
      lg: "h-12 px-8",
      md: "h-11 px-6",
      sm: "h-10 px-4",
      xl: "h-13 px-10",
    },
    variant: {
      primary: "text-white dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
    },
  },
});

type MyButtonVariants = VariantProps<typeof myButtonVariants>;
export type MyButtonProps = Omit<ButtonProps, "className"> &
  MyButtonVariants & {className?: string};

function CustomButton({className, radius, variant, ...props}: MyButtonProps) {
  return <Button className={myButtonVariants({className, radius, variant})} {...props} />;
}

export function CustomVariants() {
  return <CustomButton>Custom Button</CustomButton>;
}

```

### Adding Ripple Effect

The Button component supports ripple effects through composition, allowing you to nest ripple components as children. This example uses [m3-ripple](https://github.com/saltyaom/m3-ripple).

```tsx
"use client";

import {Button} from "@heroui/react";
import {Ripple} from "m3-ripple";

import "m3-ripple/ripple.css";

export function RippleEffect() {
  return (
    <Button variant="secondary">
      <Ripple />
      Click me
    </Button>
  );
}

```

### CSS Classes

The Button component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/button.css)):

#### Base & Size Classes

- `.button` - Base button styles
- `.button--sm` - Small size variant
- `.button--md` - Medium size variant
- `.button--lg` - Large size variant

#### Variant Classes

- `.button--primary`
- `.button--secondary`
- `.button--tertiary`
- `.button--outline`
- `.button--ghost`
- `.button--danger`

#### Modifier Classes

- `.button--icon-only`
- `.button--icon-only.button--sm`
- `.button--icon-only.button--lg`

### Interactive States

The button supports both CSS pseudo-classes and data attributes for flexibility:

- **Hover**: `:hover` or `[data-hovered="true"]`
- **Active/Pressed**: `:active` or `[data-pressed="true"]` (includes scale transform)
- **Focus**: `:focus-visible` or `[data-focus-visible="true"]` (shows focus ring)
- **Disabled**: `:disabled` or `[aria-disabled="true"]` (reduced opacity, no pointer events)
- **Pending**: `[data-pending]` (no pointer events during loading)

## API Reference

### Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'tertiary' \| 'outline' \| 'ghost' \| 'danger'` | `'primary'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the button |
| `fullWidth` | `boolean` | `false` | Whether the button should take full width of its container |
| `isDisabled` | `boolean` | `false` | Whether the button is disabled |
| `isPending` | `boolean` | `false` | Whether the button is in a loading state |
| `isIconOnly` | `boolean` | `false` | Whether the button contains only an icon |
| `onPress` | `(e: PressEvent) => void` | - | Handler called when the button is pressed |
| `children` | `React.ReactNode \| (values: ButtonRenderProps) => React.ReactNode` | - | Button content or render prop |
| `render` | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, ButtonRenderProps>` | - | Overrides the default DOM element with a custom render function.|

### ButtonRenderProps

When using the render prop pattern, these values are provided:

| Prop | Type | Description |
|------|------|-------------|
| `isPending` | `boolean` | Whether the button is in a loading state |
| `isPressed` | `boolean` | Whether the button is currently pressed |
| `isHovered` | `boolean` | Whether the button is hovered |
| `isFocused` | `boolean` | Whether the button is focused |
| `isFocusVisible` | `boolean` | Whether the button should show focus indicator |
| `isDisabled` | `boolean` | Whether the button is disabled |
</page>

<page url="/en/docs/react/components/button-group">
# ButtonGroup

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/button-group
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(buttons)/button-group.mdx
> Group related buttons together with consistent styling and spacing


***

## Import

```tsx
import { ButtonGroup, Button } from '@heroui/react';

```

### Usage

```tsx
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CodeFork,
  Ellipsis,
  Picture,
  Pin,
  QrCode,
  Star,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  ThumbsDown,
  ThumbsUp,
  Video,
} from "@gravity-ui/icons";
import {Button, ButtonGroup, Chip, Description, Dropdown, Label} from "@heroui/react";

export function Basic() {
  return (
    <div className="flex flex-col items-start gap-6">
      {/* Single button with dropdown */}
      <div className="flex flex-col gap-2">
        <ButtonGroup>
          <Button>Merge pull request</Button>
          <Dropdown>
            <Button isIconOnly aria-label="More options">
              <ButtonGroup.Separator />
              <ChevronDown />
            </Button>
            <Dropdown.Popover className="max-w-[290px]" placement="bottom end">
              <Dropdown.Menu>
                <Dropdown.Item
                  className="flex flex-col items-start gap-1"
                  id="merge"
                  textValue="Create a merge commit"
                >
                  <Label>Create a merge commit</Label>
                  <Description>
                    All commits from this branch will be added to the base branch
                  </Description>
                </Dropdown.Item>
                <Dropdown.Item
                  className="flex flex-col items-start gap-1"
                  id="squash-and-merge"
                  textValue="Squash and merge"
                >
                  <Label>Squash and merge</Label>
                  <Description>
                    The 14 commits from this branch will be combined into one commit in the base
                    branch
                  </Description>
                </Dropdown.Item>
                <Dropdown.Item
                  className="flex flex-col items-start gap-1"
                  id="rebase-and-merge"
                  textValue="Rebase and merge"
                >
                  <Label>Rebase and merge</Label>
                  <Description>
                    The 14 commits from this branch will be rebased and added to the base branch
                  </Description>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </ButtonGroup>
      </div>

      {/* Individual buttons */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-x-2 gap-y-4">
          <ButtonGroup variant="tertiary">
            <Button>
              <CodeFork className="size-3.5" />
              Fork
              <Chip color="accent" size="sm" variant="soft">
                24
              </Chip>
            </Button>
            <Button isIconOnly>
              <ButtonGroup.Separator />
              <ChevronDown />
            </Button>
          </ButtonGroup>
          <ButtonGroup variant="tertiary">
            <Button isIconOnly>
              <QrCode />
            </Button>
            <Button>
              <ButtonGroup.Separator />
              Scan to pay
            </Button>
          </ButtonGroup>
          <ButtonGroup variant="tertiary">
            <Button>
              <ThumbsUp />
              <span className="text-xs font-semibold">2.4K</span>
            </Button>
            <Button isIconOnly>
              <ButtonGroup.Separator />
              <ThumbsDown />
            </Button>
          </ButtonGroup>
          <ButtonGroup variant="tertiary">
            <Button>
              <Star className="size-3.5" />
              Star
            </Button>
            <Button className="px-2">
              <ButtonGroup.Separator />
              <Chip color="accent" size="sm" variant="soft">
                104
              </Chip>
            </Button>
          </ButtonGroup>
          <ButtonGroup variant="tertiary">
            <Button>
              <Pin />
              Pinned
            </Button>
            <Button isIconOnly>
              <ButtonGroup.Separator />
              <ChevronDown />
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {/* Previous/Next Button Group */}
      <div className="flex flex-col gap-2">
        <ButtonGroup variant="tertiary">
          <Button>
            <ChevronLeft />
            Previous
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Next
            <ChevronRight />
          </Button>
        </ButtonGroup>
      </div>

      {/* Content Selection Button Group */}
      <div className="flex flex-col gap-2">
        <ButtonGroup variant="tertiary">
          <Button>
            <Picture />
            Photos
          </Button>
          <Button>
            <ButtonGroup.Separator />
            <Video />
            Videos
          </Button>
          <Button isIconOnly aria-label="More options">
            <ButtonGroup.Separator />
            <Ellipsis />
          </Button>
        </ButtonGroup>
      </div>

      {/* Text Alignment Button Group */}
      <div className="flex flex-col gap-2">
        <ButtonGroup variant="tertiary">
          <Button>Left</Button>
          <Button>
            <ButtonGroup.Separator />
            Center
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Right
          </Button>
        </ButtonGroup>
      </div>

      {/* Icon-Only Alignment Button Group */}
      <div className="flex flex-col gap-2">
        <ButtonGroup variant="tertiary">
          <Button isIconOnly>
            <TextAlignLeft />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TextAlignCenter />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TextAlignRight />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TextAlignJustify />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

```

### Anatomy

Import the ButtonGroup component and access all parts using dot notation.

```tsx
import { ButtonGroup, Button } from '@heroui/react';

export default () => (
  <ButtonGroup>
    <Button>First</Button>
    <Button>
      <ButtonGroup.Separator />
      Second
    </Button>
    <Button>
      <ButtonGroup.Separator />
      Third
    </Button>
  </ButtonGroup>
);

```

> **ButtonGroup** wraps multiple Button components together, applying consistent styling, spacing, and automatic border radius handling. It uses React Context to pass `size`, `variant`, and `isDisabled` props to all child buttons.

### Variants

```tsx
import {Button, ButtonGroup} from "@heroui/react";

export function Variants() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Primary</p>
        <ButtonGroup variant="primary">
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Secondary</p>
        <ButtonGroup variant="secondary">
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Tertiary</p>
        <ButtonGroup variant="tertiary">
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Outline</p>
        <ButtonGroup variant="outline">
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Ghost</p>
        <ButtonGroup variant="ghost">
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Danger</p>
        <ButtonGroup variant="danger">
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

```

### Sizes

```tsx
import {Button, ButtonGroup} from "@heroui/react";

export function Sizes() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted">Small</p>
        <ButtonGroup size="sm" variant="secondary">
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted">Medium (default)</p>
        <ButtonGroup size="md" variant="secondary">
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted">Large</p>
        <ButtonGroup size="lg" variant="secondary">
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

```

### Orientation

Use the `orientation` prop to arrange buttons horizontally or vertically.

```tsx
import {TextAlignCenter, TextAlignJustify, TextAlignLeft, TextAlignRight} from "@gravity-ui/icons";
import {Button, ButtonGroup} from "@heroui/react";

export function Orientation() {
  return (
    <div className="flex items-start gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Horizontal</span>
        <ButtonGroup orientation="horizontal" variant="tertiary">
          <Button isIconOnly>
            <TextAlignLeft />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TextAlignCenter />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TextAlignRight />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TextAlignJustify />
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Vertical</span>
        <ButtonGroup orientation="vertical" variant="tertiary">
          <Button isIconOnly>
            <TextAlignLeft />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TextAlignCenter />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TextAlignRight />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TextAlignJustify />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

```

### With Icons

```tsx
import {Globe, Plus, TrashBin} from "@gravity-ui/icons";
import {Button, ButtonGroup} from "@heroui/react";

export function WithIcons() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted">With icons</p>
        <ButtonGroup variant="secondary">
          <Button>
            <Globe />
            Search
          </Button>
          <Button>
            <ButtonGroup.Separator />
            <Plus />
            Add
          </Button>
          <Button>
            <ButtonGroup.Separator />
            <TrashBin />
            Delete
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted">Icon only buttons</p>
        <ButtonGroup variant="tertiary">
          <Button isIconOnly>
            <Globe />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <Plus />
          </Button>
          <Button isIconOnly>
            <ButtonGroup.Separator />
            <TrashBin />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

```

### Full Width

```tsx
import {TextAlignCenter, TextAlignLeft, TextAlignRight} from "@gravity-ui/icons";
import {Button, ButtonGroup} from "@heroui/react";

export function FullWidth() {
  return (
    <div className="w-[400px] space-y-3">
      <ButtonGroup fullWidth>
        <Button>First</Button>
        <Button>
          <ButtonGroup.Separator />
          Second
        </Button>
        <Button>
          <ButtonGroup.Separator />
          Third
        </Button>
      </ButtonGroup>
      <ButtonGroup fullWidth>
        <Button isIconOnly>
          <TextAlignLeft />
        </Button>
        <Button isIconOnly>
          <ButtonGroup.Separator />
          <TextAlignCenter />
        </Button>
        <Button isIconOnly>
          <ButtonGroup.Separator />
          <TextAlignRight />
        </Button>
      </ButtonGroup>
    </div>
  );
}

```

### Disabled State

```tsx
import {Button, ButtonGroup} from "@heroui/react";

export function Disabled() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted">All buttons disabled</p>
        <ButtonGroup isDisabled>
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button>
            <ButtonGroup.Separator />
            Third
          </Button>
        </ButtonGroup>
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted">Group disabled, but one button overrides</p>
        <ButtonGroup isDisabled>
          <Button>First</Button>
          <Button>
            <ButtonGroup.Separator />
            Second
          </Button>
          <Button isDisabled={false}>
            <ButtonGroup.Separator />
            Third (enabled)
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

```

### Without Separator

Simply omit the `<ButtonGroup.Separator />` component from your buttons.

```tsx
import {Button, ButtonGroup} from "@heroui/react";

export function WithoutSeparator() {
  return (
    <ButtonGroup>
      <Button>First</Button>
      <Button>Second</Button>
      <Button>Third</Button>
    </ButtonGroup>
  );
}

```

## Related Components

- **Button**: Allows a user to perform an action
- **Dropdown**: Context menu with actions and options
- **Chip**: Compact elements for tags and filters

## Styling

### Passing Tailwind CSS classes

```tsx
import { ButtonGroup, Button } from '@heroui/react';

function CustomButtonGroup() {
  return (
    <ButtonGroup className="gap-2">
      <Button>First</Button>
      <Button>
        <ButtonGroup.Separator />
        Second
      </Button>
      <Button>
        <ButtonGroup.Separator />
        Third
      </Button>
    </ButtonGroup>
  );
}

```

### Customizing the component classes

To customize the ButtonGroup component classes, you can use the `@layer components` directive.
<br/>[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .button-group {
    @apply gap-2 rounded-lg;
  }

  .button-group__separator {
    @apply opacity-25;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The ButtonGroup component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/button-group.css)):

#### Base Classes

- `.button-group` - Base button group container
- `.button-group--full-width` - Full width modifier
- `.button-group__separator` - Separator element between buttons

The ButtonGroup component automatically applies border radius to buttons:
- First button gets rounded left/start edge
- Last button gets rounded right/end edge
- Middle buttons have no border radius
- Single button gets full border radius on all edges

Add `<ButtonGroup.Separator />` inside each Button (except the first) to show dividers between buttons.

## API Reference

### ButtonGroup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'tertiary' \| 'ghost' \| 'danger'` | - | Visual style variant applied to all buttons in the group |
| `size` | `'sm' \| 'md' \| 'lg'` | - | Size applied to all buttons in the group |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | The orientation of the button group |
| `fullWidth` | `boolean` | `false` | Whether the button group should take full width of its container |
| `isDisabled` | `boolean` | `false` | Whether all buttons in the group are disabled (can be overridden on individual buttons) |
| `className` | `string` | - | Additional CSS classes |
| `children` | `React.ReactNode` | - | Button components to group together |

### ButtonGroup.Separator Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

### Notes

- ButtonGroup uses React Context to pass `size`, `variant`, and `isDisabled` props to all child Button components
- **Only direct child buttons receive the ButtonGroup props** - Buttons nested inside other components (like Modal, Dropdown, etc.) will not inherit the group's props even if they are descendants of the ButtonGroup
- Individual Button components can override the group's `isDisabled` prop by setting `isDisabled={false}`
- The component automatically handles border radius between buttons
- Add `<ButtonGroup.Separator />` inside each Button (except the first) to show dividers between buttons
- Buttons in a group have their active/pressed scale transform removed for a more cohesive appearance
</page>

<page url="/en/docs/react/components/card">
# Card

**Category**: react
**URL**: https://www.heroui.com/en/docs/react/components/card
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(layout)/card.mdx
> Flexible container component for grouping related content and actions


***

## Import

```tsx
import { Card } from "@heroui/react";

```

### Usage

```tsx
import {CircleDollar} from "@gravity-ui/icons";
import {Card, Link} from "@heroui/react";

export function Default() {
  return (
    <Card className="w-[400px]">
      <CircleDollar aria-label="Dollar sign icon" className="text-primary size-6" role="img" />
      <Card.Header>
        <Card.Title>Become an Acme Creator!</Card.Title>
        <Card.Description>
          Visit the Acme Creator Hub to sign up today and start earning credits from your fans and
          followers.
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Link
          aria-label="Go to Acme Creator Hub (opens in new tab)"
          href="https://heroui.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          Creator Hub
          <Link.Icon aria-hidden="true" />
        </Link>
      </Card.Footer>
    </Card>
  );
}

```

### Anatomy

Import the Card component and access all parts using dot notation.

```tsx
import { Card } from "@heroui/react";

export default () => (
  <Card>
    <Card.Header>
      <Card.Title />
      <Card.Description />
    </Card.Header>
    <Card.Content />
    <Card.Footer />
  </Card>
);

```

### Variants

Cards come in semantic variants that describe their prominence level rather than specific visual styles. This allows themes to interpret them differently:

```tsx
import {Card} from "@heroui/react";

export function Variants() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="w-[320px]" variant="transparent">
        <Card.Header>
          <Card.Title>Transparent</Card.Title>
          <Card.Description>Minimal prominence with transparent background</Card.Description>
        </Card.Header>
        <Card.Content>
          <p>Use for less important content or nested cards</p>
        </Card.Content>
      </Card>

      <Card className="w-[320px]" variant="default">
        <Card.Header>
          <Card.Title>Default</Card.Title>
          <Card.Description>Standard card appearance (bg-surface)</Card.Description>
        </Card.Header>
        <Card.Content>
          <p>The default card variant for most use cases</p>
        </Card.Content>
      </Card>

      <Card className="w-[320px]" variant="secondary">
        <Card.Header>
          <Card.Title>Secondary</Card.Title>
          <Card.Description>Medium prominence (bg-surface-secondary)</Card.Description>
        </Card.Header>
        <Card.Content>
          <p>Use to draw moderate attention</p>
        </Card.Content>
      </Card>

      <Card className="w-[320px]" variant="tertiary">
        <Card.Header>
          <Card.Title>Tertiary</Card.Title>
          <Card.Description>Higher prominence (bg-surface-tertiary)</Card.Description>
        </Card.Header>
        <Card.Content>
          <p>Use for primary or featured content</p>
        </Card.Content>
      </Card>
    </div>
  );
}

```

- **`transparent`** - Minimal prominence, transparent background (great for nested cards)
- **`default`** - Standard card for most use cases (surface-secondary)
- **`secondary`** - Medium prominence to draw moderate attention (surface-tertiary)
- **`tertiary`** - Higher prominence for important content (surface-tertiary)

### Horizontal Layout

```tsx
import {Button, Card, CloseButton} from "@heroui/react";

export function Horizontal() {
  return (
    <Card className="w-full items-stretch md:flex-row">
      <div className="relative h-[140px] w-full shrink-0 overflow-hidden rounded-2xl sm:h-[120px] sm:w-[120px]">
        <img
          alt="Cherries"
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover select-none"
          loading="lazy"
          src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/cherries.jpeg"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <Card.Header className="gap-1">
          <Card.Title className="pr-8">Become an ACME Creator!</Card.Title>
          <Card.Description>
            Lorem ipsum dolor sit amet consectetur. Sed arcu donec id aliquam dolor sed amet
            faucibus etiam.
          </Card.Description>
          <CloseButton aria-label="Close banner" className="absolute top-3 right-3" />
        </Card.Header>
        <Card.Footer className="mt-auto flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Only 10 spots</span>
            <span className="text-xs text-muted">Submission ends Oct 10.</span>
          </div>
          <Button className="w-full sm:w-auto">Apply Now</Button>
        </Card.Footer>
      </div>
    </Card>
  );
}

```

### With Avatar

```tsx
import {Avatar, Card} from "@heroui/react";

export function WithAvatar() {
  return (
    <div className="flex flex-wrap gap-4">
      <Card className="w-[200px] gap-2">
        <img
          alt="Indie Hackers community"
          className="pointer-events-none aspect-square w-14 rounded-2xl object-cover select-none"
          loading="lazy"
          src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/demo1.jpg"
        />
        <Card.Header>
          <Card.Title>Indie Hackers</Card.Title>
          <Card.Description>148 members</Card.Description>
        </Card.Header>
        <Card.Footer className="flex gap-2">
          <Avatar aria-label="Martha's profile picture" className="size-5">
            <Avatar.Image
              alt="Martha's avatar"
              src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg"
            />
            <Avatar.Fallback className="text-xs">IH</Avatar.Fallback>
          </Avatar>
          <span className="text-xs">By Martha</span>
        </Card.Footer>
      </Card>

      <Card className="w-[200px] gap-2">
        <img
          alt="AI Builders community"
          className="pointer-events-none aspect-square w-14 rounded-2xl object-cover select-none"
          loading="lazy"
          src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/demo2.jpg"
        />
        <Card.Header>
          <Card.Title>AI Builders</Card.Title>
          <Card.Description>362 members</Card.Description>
        </Card.Header>
        <Card.Footer className="flex gap-2">
          <Avatar aria-label="John's profile picture" className="size-5">
            <Avatar.Image
              alt="John's avatar - blue themed"
              src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg"
            />
            <Avatar.Fallback className="text-xs">B</Avatar.Fallback>
          </Avatar>
          <span className="text-xs">By John</span>
        </Card.Footer>
      </Card>
    </div>
  );
}

```

### With Images

```tsx
import {CircleDollar} from "@gravity-ui/icons";
import {Avatar, Button, Card, CloseButton, Link} from "@heroui/react";

export function WithImages() {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="grid w-full max-w-2xl grid-cols-12 gap-4 p-4">
        {/* Row 1: Large Product Card - Available Soon */}
        <Card className="col-span-12 flex h-auto min-h-[152px] flex-col sm:flex-row">
          <div className="relative h-[140px] w-full shrink-0 overflow-hidden rounded-2xl sm:h-[120px] sm:w-[120px]">
            <img
              alt="Cherries"
              className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover select-none"
              loading="lazy"
              src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/cherries.jpeg"
            />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <Card.Header className="gap-1">
              <Card.Title className="pr-8">Become an ACME Creator!</Card.Title>
              <Card.Description>
                Lorem ipsum dolor sit amet consectetur. Sed arcu donec id aliquam dolor sed amet
                faucibus etiam.
              </Card.Description>
              <CloseButton aria-label="Close banner" className="absolute top-3 right-3" />
            </Card.Header>
            <Card.Footer className="mt-auto flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Only 10 spots</span>
                <span className="text-xs text-muted">Submission ends Oct 10.</span>
              </div>
              <Button className="w-full sm:w-auto">Apply Now</Button>
            </Card.Footer>
          </div>
        </Card>

        {/* Row 2 */}
        <div className="col-span-12 grid grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="col-span-12 grid grid-cols-12 gap-4 lg:col-span-6">
            {/* Top Card */}
            <Card className="col-span-12">
              <div className="absolute top-3 right-3 z-10">
                <CloseButton aria-label="Close notification" />
              </div>
              <Card.Header className="gap-3">
                <CircleDollar
                  aria-label="Dollar sign icon"
                  className="text-primary size-8 shrink-0"
                  role="img"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted uppercase">PAYMENT</span>
                  <Card.Title className="pr-8 text-sm sm:text-base">
                    You can now withdraw on crypto
                  </Card.Title>
                  <Card.Description className="text-xs sm:text-sm">
                    Add your wallet in settings to withdraw
                  </Card.Description>
                </div>
              </Card.Header>
              <Card.Footer>
                <Link aria-label="Go to settings" href="#" rel="noopener noreferrer">
                  Go to settings
                  <Link.Icon aria-hidden="true" />
                </Link>
              </Card.Footer>
            </Card>
            {/* Bottom cards */}
            <div className="col-span-12 grid grid-cols-12 gap-4">
              {/* Left Card */}
              <Card className="col-span-12 gap-2 sm:col-span-6">
                <Card.Header>
                  <Avatar className="size-[56px] rounded-xl">
                    <Avatar.Image
                      alt="Demo 1"
                      src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/demo1.jpg"
                    />
                    <Avatar.Fallback>JK</Avatar.Fallback>
                  </Avatar>
                </Card.Header>
                <Card.Content className="mt-1">
                  <p className="text-sm leading-4 font-medium">Indie Hackers</p>
                  <p className="text-xs text-muted">148 members</p>
                </Card.Content>
                <Card.Footer className="flex items-center gap-2">
                  <Avatar className="size-4">
                    <Avatar.Image
                      alt="John"
                      src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg"
                    />
                    <Avatar.Fallback>JK</Avatar.Fallback>
                  </Avatar>
                  <p className="text-xs text-muted">By John</p>
                </Card.Footer>
              </Card>
              {/* Right Card */}
              <Card className="col-span-12 gap-2 sm:col-span-6">
                <Card.Header>
                  <Avatar className="size-[56px] rounded-xl">
                    <Avatar.Image
                      alt="Demo 2"
                      src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/demo2.jpg"
                    />
                    <Avatar.Fallback>AB</Avatar.Fallback>
                  </Avatar>
                </Card.Header>
                <Card.Content className="mt-1">
                  <p className="text-sm leading-4 font-medium">AI Builders</p>
                  <p className="text-xs text-muted">362 members</p>
                </Card.Content>
                <Card.Footer className="flex items-center gap-2">
                  <Avatar className="size-4">
                    <Avatar.Image
                      alt="John"
                      src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg"
                    />
                    <Avatar.Fallback>M</Avatar.Fallback>
                  </Avatar>
                  <p className="text-xs text-muted">By Martha</p>
                </Card.Footer>
              </Card>
            </div>
          </div>
          {/* Right Column */}
          <Card className="col-span-12 min-h-[200px] overflow-hidden rounded-3xl lg:col-span-6">
            {/* Background image */}
            <img
              alt="NEO Home Robot"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/neo2.jpeg"
            />

            {/* Header */}
            <Card.Header className="z-10 text-white">
              <Card.Title className="text-xs font-semibold tracking-wide text-black/70">
                NEO
              </Card.Title>
              <Card.Description className="text-sm leading-5 font-medium text-black/50">
                Home Robot
              </Card.Description>
            </Card.Header>

            {/* Footer */}
            <Card.Footer className="z-10 mt-auto flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-black">Available soon</div>
                <div className="text-xs text-black/60">Get notified</div>
              </div>
              <Button className="bg-white text-black" size="sm" variant="tertiary">
                Notify me
              </Button>
            </Card.Footer>
          </Card>
        </div>

        {/* Row 3 */}
        <div className="col-span-12 grid grid-cols-12 gap-4">
          {/* Left Column: Card */}
          <Card className="relative col-span-12 h-[250px] sm:h-[300px] md:col-span-8 md:h-[350px]">
            <img
              alt="NEO Home Robot"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/neo1.jpeg"
            />

            <Card.Footer className="z-10 mt-auto flex items-end justify-between">
              <div>
                <div className="text-base font-medium text-black sm:text-lg">NEO</div>
                <div className="text-xs font-medium text-black/50 sm:text-sm">$499/m</div>
              </div>
              <Button className="bg-white text-black" size="sm" variant="tertiary">
                Get now
              </Button>
            </Card.Footer>
          </Card>

          {/* Right Column: Cards Stack */}
          <div className="col-span-12 flex flex-col gap-2 md:col-span-4 md:justify-between md:gap-0 md:py-2">
            {/* 1 */}
            <Card className="flex flex-row gap-3 p-1" variant="transparent">
              <img
                alt="Futuristic Robot"
                className="aspect-square h-16 w-16 shrink-0 rounded-xl object-cover select-none sm:h-20 sm:w-20"
                loading="lazy"
                src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/robot1.jpeg"
              />
              <div className="flex flex-1 flex-col justify-center gap-1">
                <Card.Title className="text-sm">Bridging the Future</Card.Title>
                <Card.Description className="text-xs">Today, 6:30 PM</Card.Description>
              </div>
            </Card>
            {/* 2 */}
            <Card className="flex flex-row gap-3 p-1" variant="transparent">
              <img
                alt="Avocado"
                className="aspect-square h-16 w-16 shrink-0 rounded-xl object-cover select-none sm:h-20 sm:w-20"
                loading="lazy"
                src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/avocado.jpeg"
              />
              <div className="flex flex-1 flex-col justify-center gap-1">
                <Card.Title className="text-sm">Avocado Hackathon</Card.Title>
                <Card.Description className="text-xs">Wed, 4:30 PM</Card.Description>
              </div>
            </Card>
            {/* 3 */}
            <Card className="flex flex-row gap-3 p-1" variant="transparent">
              <img
                alt="Sound Electro event"
                className="aspect-square h-16 w-16 shrink-0 rounded-xl object-cover select-none sm:h-20 sm:w-20"
                loading="lazy"
                src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/docs/oranges.jpeg"
              />
              <div className="flex flex-1 flex-col justify-center gap-1">
                <Card.Title className="text-sm">Sound Electro | Beyond art</Card.Title>
                <Card.Description className="text-xs">Fri, 8:00 PM</Card.Description>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

```

### With Form

```tsx
"use client";

import {Button, Card, Form, Input, Label, Link, TextField} from "@heroui/react";

export function WithForm() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};

    // Convert FormData to plain object
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    alert("Form submitted successfully!");
  };

  return (
    <Card className="w-full max-w-md">
      <Card.Header>
        <Card.Title>Login</Card.Title>
        <Card.Description>Enter your credentials to access your account</Card.Description>
      </Card.Header>
      <Form onSubmit={onSubmit}>
        <Card.Content>
          <div className="flex flex-col gap-4">
            <TextField name="email" type="email">
              <Label>Email</Label>
              <Input placeholder="email@example.com" variant="secondary" />
            </TextField>
            <TextField name="password" type="password">
              <Label>Password</Label>
              <Input placeholder="••••••••" variant="secondary" />
            </TextField>
          </div>
        </Card.Content>
        <Card.Footer className="mt-4 flex flex-col gap-2">
          <Button className="w-full" type="submit">
            Sign In
          </Button>
          <Link className="text-center text-sm" href="#">
            Forgot password?
          </Link>
        </Card.Footer>
      </Form>
    </Card>
  );
}

```

## Accessibility

```tsx
import { Card } from '@heroui/react';
import { cardVariants } from '@heroui/styles';

// Semantic markup
<Card role="article" aria-labelledby="card-title">
  <Card.Header>
    <Card.Title id="card-title">Article Title</Card.Title>
  </Card.Header>
</Card>

// Interactive cards
<a className={cardVariants().base()} href="/details" aria-label="View product details">
  <Card.Title>Product Name</Card.Title>
</a>

```

## Related Components

- **Surface**: Base container surface
- **Avatar**: Display user profile images
- **Form**: Form validation and submission handling

## Styling

### Component Customization

```tsx
<Card className="border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50">
  <Card.Header>
    <Card.Title className="text-blue-900">Custom Styled Card</Card.Title>
    <Card.Description className="text-blue-700">Custom colors applied</Card.Description>
  </Card.Header>
  <Card.Content>
    <p className="text-blue-800">Content with custom styling</p>
  </Card.Content>
</Card>

```

### CSS Variable Overrides

```css
/* Override specific variants */
.card--secondary {
  @apply bg-gradient-to-br from-blue-50 to-purple-50;
}

/* Custom element styles */
.card__title {
  @apply text-xl font-bold;
}

```

## CSS Classes

Card uses [BEM](https://getbem.com/) naming for predictable styling, ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/card.css)):

#### Base Classes

- `.card` - Base container with padding and border
- `.card__header` - Header section container
- `.card__title` - Title with base font size and weight
- `.card__description` - Muted description text
- `.card__content` - Flexible content container
- `.card__footer` - Footer with row layout

#### Variant Classes

- `.card--transparent` - Minimal prominence, transparent background (maps to `transparent` variant)
- `.card--default` - Standard appearance with surface-secondary (default)
- `.card--secondary` - Medium prominence with surface-tertiary (maps to `secondary` variant)
- `.card--tertiary` - Higher prominence with surface-tertiary (maps to `tertiary` variant)

## API Reference

### Card

| Prop        | Type                                                      | Default      | Description                |
| ----------- | --------------------------------------------------------- | ------------ | -------------------------- |
| `variant`   | `"transparent" \| "default" \| "secondary" \| "tertiary"`         | `"default"` | Semantic variant indicating prominence level |
| `className` | `string`                          | -       | Additional CSS classes     |
| `children`  | `React.ReactNode`                 | -       | Card content               |

### Card.Header

| Prop        | Type              | Default | Description               |
| ----------- | ----------------- | ------- | ------------------------- |
| `className` | `string`          | -       | Additional CSS classes    |
| `children`  | `React.ReactNode` | -       | Header content            |

### Card.Title

| Prop        | Type              | Default | Description                      |
| ----------- | ----------------- | ------- | -------------------------------- |
| `className` | `string`          | -       | Additional CSS classes           |
| `children`  | `React.ReactNode` | -       | Title content (renders as `h3`) |

### Card.Description

| Prop        | Type              | Default | Description                     |
| ----------- | ----------------- | ------- | ------------------------------- |
| `className` | `string`          | -       | Additional CSS classes          |
| `children`  | `React.ReactNode` | -       | Description content (renders as `p`) |

### Card.Content

| Prop        | Type              | Default | Description               |
| ----------- | ----------------- | ------- | ------------------------- |
| `className` | `string`          | -       | Additional CSS classes    |
| `children`  | `React.ReactNode` | -       | Main content              |

### Card.Footer

| Prop        | Type              | Default | Description               |
| ----------- | ----------------- | ------- | ------------------------- |
| `className` | `string`          | -       | Additional CSS classes    |
| `children`  | `React.ReactNode` | -       | Footer content            |
</page>
