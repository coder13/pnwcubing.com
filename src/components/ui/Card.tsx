import classNames from "classnames";
import { CardProps } from "flowbite-react";
import Image from "next/image";

export const Card = (props: CardProps) => {
  const { className, children, imgSrc, ...rest } = props;
  return (
    <div
      className={classNames(
        "flex flex-col justify-between p-4 rounded-lg shadow-md bg-white dark:bg-gray-800",
        className,
      )}
      {...rest}
    >
      <div className="flex flex-col">
        {imgSrc && (
          <div className="mb-4">
            <Image src={imgSrc} alt="card" className="rounded-lg" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
